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
        const msg = `⚠️ మీ U9PGs subscription ${dateStr}న expire అవుతుంది. Renew చేయడానికి app తెరవండి.`;
        
        // Simulate sending WhatsApp message
        console.log(`[WhatsApp Mock] To: ${ownerPhone} | Msg: ${msg}`);
      }

      // --- AUTO-DOWNGRADE TRIAL LOGIC ---
      console.log(`[Job ${job.id}] Checking for expired PRO trials to auto-downgrade...`);
      
      const expiredTrials = await prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: {
            lt: now // Trial end date has passed
          }
        },
        include: {
          organization: true
        }
      });

      console.log(`Found ${expiredTrials.length} expired trials to downgrade to BASIC.`);

      for (const trial of expiredTrials) {
        // STRICT LOCKOUT: Expire the trial, do NOT downgrade to BASIC
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: trial.id },
            data: { status: 'EXPIRED' }
          }),
          prisma.organization.update({
            where: { id: trial.organizationId },
            data: { subscriptionStatus: 'EXPIRED' }
          })
        ]);

        const ownerPhone = trial.organization.ownerPhone;
        const msg = `⚠️ మీ U9PGs 14-రోజుల ఫ్రీ ట్రయల్ ముగిసింది. దయచేసి సేవలను కొనసాగించడానికి మీ ప్లాన్‌ను అప్‌గ్రేడ్ చేయండి.`;
        console.log(`[WhatsApp Mock] Locked Expired Trial: ${trial.organization.name} | Msg: ${msg}`);
      }

      // --- AUTO-EXPIRE EXPIRED PAID SUBSCRIPTIONS ---
      console.log(`[Job ${job.id}] Checking for expired PAID subscriptions to lock out...`);

      const expiredPaidSubs = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            lt: now
          }
        },
        include: {
          organization: true
        }
      });

      console.log(`Found ${expiredPaidSubs.length} expired paid subscriptions to lock out.`);

      for (const sub of expiredPaidSubs) {
        // STRICT LOCKOUT: Expire the paid plan
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' }
          }),
          prisma.organization.update({
            where: { id: sub.organizationId },
            data: { subscriptionStatus: 'EXPIRED' }
          })
        ]);

        const ownerPhone = sub.organization.ownerPhone;
        const msg = `⚠️ మీ U9PGs సబ్‌స్క్రిప్షన్ గడువు ముగిసింది. దయచేసి మీ ప్లాన్‌ను రెన్యూవల్ చేయండి.`;
        console.log(`[WhatsApp Mock] Locked Expired Sub: ${sub.organization.name} | Msg: ${msg}`);
      }

      console.log(`[Job ${job.id}] Finished subscription renewal and expiration checks.`);
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
