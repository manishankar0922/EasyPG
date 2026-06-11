import { ExpressAdapter } from '@bull-board/express';

// Dummy implementation to avoid Redis connection crashes locally when Redis is not installed
export const invoiceQueue = { add: async () => ({ id: 'mock-job-id' }) } as any;
export const notificationQueue = { add: async () => ({ id: 'mock-job-id' }) } as any;
export const ocrQueue = { add: async () => ({ id: 'mock-job-id' }) } as any;

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

export const QueueService = {
  async addInvoiceJob(data: any) {
    console.log('Mock: Added invoice job', data);
    return { id: 'mock' };
  },
  async addNotificationJob(data: any) {
    console.log('Mock: Added notification job', data);
    return { id: 'mock' };
  },
  async addOCRJob(data: any) {
    console.log('Mock: Added OCR job', data);
    return { id: 'mock' };
  }
};

export const startWorkers = () => {
  console.log('👷 Mock Workers started (Redis is disabled locally to prevent crashes)...');
};
