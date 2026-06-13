import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { generateMonthlyRentJob } from './generateMonthlyRent';

export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true
});

export const rentQueue = new Queue('rent-generation', { 
  connection: redisConnection as any 
});

export const subscriptionReminderQueue = new Queue('subscription-reminder-queue', {
  connection: redisConnection as any
});

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

  // Import the worker to instantiate it
  require('./subscriptionReminder');
};
