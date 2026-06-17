import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { redisConnection, setupJobs } from '../jobs/index';

// Initialize actual BullMQ Queues pointing to the Redis connection
export const invoiceQueue = new Queue('invoice-queue', { connection: redisConnection as any });
invoiceQueue.on('error', (err) => {});

export const notificationQueue = new Queue('notification-queue', { connection: redisConnection as any });
notificationQueue.on('error', (err) => {});

export const ocrQueue = new Queue('ocr-queue', { connection: redisConnection as any });
ocrQueue.on('error', (err) => {});

export const orgSetupQueue = new Queue('org-setup-queue', { connection: redisConnection as any });
orgSetupQueue.on('error', (err) => {});

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

export const QueueService = {
  async addInvoiceJob(data: any) {
    console.log('Queuing invoice job', data);
    return await invoiceQueue.add('generate-invoice', data);
  },
  async addNotificationJob(data: any) {
    console.log('Queuing notification job', data);
    return await notificationQueue.add('send-notification', data);
  },
  async addOCRJob(data: any) {
    console.log('Queuing OCR job', data);
    return await ocrQueue.add('process-ocr', data);
  },
  async addOrgSetupJob(data: any) {
    console.log('Queuing Org Setup job', data);
    return await orgSetupQueue.add('process-org-setup', data);
  }
};

export const startWorkers = () => {
  console.log('👷 Redis / BullMQ Workers starting...');
  
  // Enable setupJobs to allow real background job processing
  setupJobs().catch(err => console.error('Failed to start background jobs:', err.message));
};
