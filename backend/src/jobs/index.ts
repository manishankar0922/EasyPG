import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { generateMonthlyRentJob } from './generateMonthlyRent';

const isProd = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// Real Redis ONLY when a REDIS_URL is actually configured (and not on Vercel —
// serverless has no persistent TCP). Without this, ioredis (maxRetriesPerRequest:
// null) queues commands forever against a non-existent localhost Redis and every
// request that awaits it hangs — which took Render down when NODE_ENV became
// production. No REDIS_URL → same mock/no-op mode as development.
export const hasRedis = isProd && !isVercel && !!process.env.REDIS_URL;

export const redisConnection = hasRedis
  ? new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableReadyCheck: false,
      keepAlive: 10000,
    })
  : {} as any;

// Mock Redlock properly so local development doesn't crash on undefined 'acquire' function
export const redlock = hasRedis ? new Redlock([redisConnection], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200
}) : {
  acquire: async () => ({
    release: async () => {},
    unlock: async () => {}
  })
} as any;

if (hasRedis) {
  let hasLoggedRedisError = false;
  redisConnection.on('error', (err: any) => {
    if (!hasLoggedRedisError) {
      console.warn('⚠️ Redis Connection Error: Caching/Background workers will not function until Redis is started.', err.message);
      hasLoggedRedisError = true;
    }
  });
}

export const rentQueue = hasRedis ? new Queue('rent-generation', { 
  connection: redisConnection as any 
}) : { add: async () => {}, on: () => {} } as any;

if (hasRedis) {
  rentQueue.on('error', (err: any) => {});
}

export const subscriptionReminderQueue = hasRedis ? new Queue('subscription-reminder-queue', {
  connection: redisConnection as any
}) : { add: async () => {}, on: () => {} } as any;

if (hasRedis) {
  subscriptionReminderQueue.on('error', (err: any) => {});
}

export const setupJobs = async () => {
  // Add recurring job
  await rentQueue.add(
    'generate-monthly-rent',
    {},
    {
      repeat: { pattern: '0 0 1 * *' } // cron: midnight on 1st of every month
    }
  );

  await subscriptionReminderQueue.add(
    'check-expiring-subscriptions',
    {},
    {
      repeat: { pattern: '0 9 * * *' } // cron: 9:00 AM every day
    }
  );

  const worker = new Worker(
    'rent-generation',
    async (job) => {
      if (job.name === 'generate-monthly-rent') {
        console.log('Running monthly rent generation job...');
        await generateMonthlyRentJob();
        console.log('Monthly rent generation completed.');
      }
    },
    { connection: redisConnection as any }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err.message);
  });

  worker.on('error', (err) => {
    // Catch worker level connection errors
  });

  // Workers are instantiated at module load time in their own files.
  // Both subscriptionReminder.ts and orgSetup.ts are self-guarded with isVercel.
  // Dynamic import avoids the circular dependency that crashes the rolldown bundler.
  await import('./subscriptionReminder');
  await import('./orgSetup');
};

