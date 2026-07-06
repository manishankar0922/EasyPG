import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { redisConnection, setupJobs } from '../jobs/index';

// On Vercel (serverless), we do NOT instantiate BullMQ queues at module load time.
// Doing so would attempt a Redis TCP connection on every cold start and crash the
// function with FUNCTION_INVOCATION_FAILED before any request is handled.
// Workers are also disabled on Vercel (see index.ts: !process.env.VERCEL guard).
const isVercel = !!process.env.VERCEL;

const makeQueue = (name: string) =>
  isVercel
    ? ({ add: async () => {}, on: () => {} } as any)
    : new Queue(name, { connection: redisConnection as any });

export const invoiceQueue = makeQueue('invoice-queue');
if (!isVercel) invoiceQueue.on('error', () => {});

export const notificationQueue = makeQueue('notification-queue');
if (!isVercel) notificationQueue.on('error', () => {});

export const ocrQueue = makeQueue('ocr-queue');
if (!isVercel) ocrQueue.on('error', () => {});

export const orgSetupQueue = makeQueue('org-setup-queue');
if (!isVercel) orgSetupQueue.on('error', () => {});

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

export const QueueService = {
  async addInvoiceJob(data: any) {
    if (isVercel) return;
    console.log('Queuing invoice job', data);
    return await invoiceQueue.add('generate-invoice', data);
  },
  async addNotificationJob(data: any) {
    if (isVercel) return;
    console.log('Queuing notification job', data);
    return await notificationQueue.add('send-notification', data);
  },
  async addOCRJob(data: any) {
    if (isVercel) return;
    console.log('Queuing OCR job', data);
    return await ocrQueue.add('process-ocr', data);
  },
  async addOrgSetupJob(data: any) {
    if (isVercel) return;
    console.log('Queuing Org Setup job', data);
    return await orgSetupQueue.add('process-org-setup', data);
  }
};

export const startWorkers = () => {
  if (isVercel) return;
  console.log('👷 Redis / BullMQ Workers starting...');

  // Enable setupJobs to allow real background job processing
  setupJobs().catch(err => console.error('Failed to start background jobs:', err.message));
};
