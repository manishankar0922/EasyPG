import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  // Pass if not authenticated (handled by auth middleware)
  if (!req.user) return next();

  if (req.user.role === 'SUPERADMIN' || req.user.role === 'superadmin' || req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  try {
    let sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user.organizationId }
    });

    if (!sub) {
      // Auto-create trial for existing orgs without a subscription record
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      sub = await prisma.subscription.create({
        data: {
          organizationId: req.user.organizationId,
          plan: 'STARTER',
          status: 'TRIAL',
          trialEndsAt: trialEnd
        }
      });
    }

    const now = new Date();

    // Trial still active
    if (sub.status === 'TRIAL' && sub.trialEndsAt > now) {
      (req as any).subscription = sub;
      return next();
    }

    // Paid subscription active
    if (sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
      (req as any).subscription = sub;
      return next();
    }

    // Trial expired
    if (sub.status === 'TRIAL' && sub.trialEndsAt < now) {
      return res.status(402).json({
        success: false,
        error: 'Trial expired. Please subscribe to continue.',
        code: 'TRIAL_EXPIRED'
      });
    }

    // Subscription expired
    if (sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(402).json({
        success: false,
        error: 'Subscription expired. Please renew.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    if (sub.status === 'SUSPENDED') {
      return res.status(402).json({
        success: false,
        error: 'Account suspended. Contact support.',
        code: 'SUSPENDED'
      });
    }

    // Default catch block for EXPIRED state
    if (sub.status === 'EXPIRED') {
      return res.status(402).json({
        success: false,
        error: 'Subscription expired. Please renew.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error', error);
    res.status(500).json({ success: false, error: 'Internal server error checking subscription' });
  }
};
