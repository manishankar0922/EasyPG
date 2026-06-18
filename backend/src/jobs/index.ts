import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { generateMonthlyRentJob } from './generateMonthlyRent';

const isProd = process.env.NODE_ENV === 'production';

export const redisConnection = isProd ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false,
  keepAlive: 10000,
}) : {} as any;

// Mock Redlock properly so local development doesn't crash on undefined 'acquire' function
export const redlock = isProd ? new Redlock([redisConnection], {
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

if (isProd) {
  let hasLoggedRedisError = false;
  redisConnection.on('error', (err: any) => {
    if (!hasLoggedRedisError) {
      console.warn('⚠️ Redis Connection Error: Caching/Background workers will not function until Redis is started.', err.message);
      hasLoggedRedisError = true;
    }
  });
}

export const rentQueue = isProd ? new Queue('rent-generation', { 
  connection: redisConnection as any 
}) : { add: async () => {}, on: () => {} } as any;

if (isProd) {
  rentQueue.on('error', (err: any) => {});
}

export const subscriptionReminderQueue = isProd ? new Queue('subscription-reminder-queue', {
  connection: redisConnection as any
}) : { add: async () => {}, on: () => {} } as any;

if (isProd) {
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

  // Import the worker to instantiate it
  require('./subscriptionReminder');
  require('./orgSetup');
};
