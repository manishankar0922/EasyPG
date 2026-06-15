import { Worker, Job } from 'bullmq';
import { redisConnection } from './index';
import prisma from '../config/db';

export const subscriptionReminderWorker = new Worker(
  'subscription-reminder-queue',
  async (job: Job) => {
    console.log(`[Job ${job.id}] Starting subscription renewal reminders...`);

    try {
      const now = new Date();
      // Target expiry date: 3 days from now
      const targetDateStart = new Date(now);
      targetDateStart.setDate(now.getDate() + 3);
      targetDateStart.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      const expiringSubs = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            gte: targetDateStart,
            lte: targetDateEnd
          }
        },
        include: {
          organization: true
        }
      });

      console.log(`Found ${expiringSubs.length} subscriptions expiring in 3 days.`);

      for (const sub of expiringSubs) {
        const dateStr = sub.currentPeriodEnd!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const ownerPhone = sub.organization.ownerPhone;
        const msg = `⚠️ మీ EasyPG subscription ${dateStr}న expire అవుతుంది. Renew చేయడానికి app తెరవండి.`;
        
        // Simulate sending WhatsApp message
        console.log(`[WhatsApp Mock] To: ${ownerPhone} | Msg: ${msg}`);
      }

      console.log(`[Job ${job.id}] Finished subscription renewal reminders.`);
    } catch (error) {
      console.error(`[Job ${job.id}] Error running subscription reminder check:`, error);
      throw error;
    }
  },
  { connection: redisConnection as any }
);

subscriptionReminderWorker.on('error', (err) => {
  // Catch worker level connection errors
});
