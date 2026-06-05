import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// 1. Define Queues
export const invoiceQueue = new Queue('invoice-generation', { connection: connection as any });
export const notificationQueue = new Queue('notifications', { connection: connection as any });
export const ocrQueue = new Queue('ocr-processing', { connection: connection as any });

// 2. Queue Service to add jobs
export const QueueService = {
  async addInvoiceJob(data: any) {
    return invoiceQueue.add('generate-monthly', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  },
  
  async addNotificationJob(data: any) {
    return notificationQueue.add('send-notification', data, {
      attempts: 5,
      removeOnComplete: true,
    });
  },

  async addOCRJob(data: any) {
    return ocrQueue.add('process-id', data, {
      attempts: 2,
    });
  }
};

// 3. Simple Worker Manager (Can be expanded into a separate process)
export const startWorkers = () => {
  console.log('👷 Workers started and listening for jobs...');

  new Worker('invoice-generation', async (job: Job) => {
    console.log(`📑 Processing invoice job ${job.id} for org: ${job.data.organizationId}`);
    // Real logic will be imported from services later
  }, { connection: connection as any });

  new Worker('notifications', async (job: Job) => {
    console.log(`🔔 Sending notification job ${job.id}`);
  }, { connection: connection as any });

  new Worker('ocr-processing', async (job: Job) => {
    console.log(`🔍 Processing OCR job ${job.id}`);
  }, { connection: connection as any });
};
