import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  // Pass if not authenticated (handled by auth middleware)
  if (!req.user) return next();

  if (req.user.role === 'SUPERADMIN') {
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
          plan: 'PRO',
          status: 'TRIAL',
          trialEndsAt: trialEnd
        }
      });

      // Synchronize legacy Organization table for SuperAdmin dashboard
      await prisma.organization.update({
        where: { id: req.user.organizationId },
        data: { subscriptionPlan: 'TRIAL', subscriptionStatus: 'ACTIVE' }
      });
    }

    const now = new Date();

    // Trial still active
    if (sub.status === 'TRIAL' && sub.trialEndsAt > now) {
      (req as any).subscription = sub;
      return next();
    }

    // Paid subscription active (or Lifetime/BASIC with no end date)
    if (sub.status === 'ACTIVE' && (!sub.currentPeriodEnd || sub.currentPeriodEnd > now)) {
      (req as any).subscription = sub;
      return next();
    }

    // Trial expired - STRICT Lockout (No more fallback to BASIC)
    if (sub.status === 'TRIAL' && sub.trialEndsAt < now) {
      sub = await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' }
      });
      // Synchronize legacy Organization table for SuperAdmin dashboard
      await prisma.organization.update({
        where: { id: sub.organizationId },
        data: { subscriptionStatus: 'EXPIRED' }
      });
      return res.status(402).json({
        success: false,
        error: 'Your 14-day Free Trial has expired. Please upgrade your plan to continue.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // Subscription expired - STRICT Lockout
    if (sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
      sub = await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' }
      });
      // Synchronize legacy Organization table for SuperAdmin dashboard
      await prisma.organization.update({
        where: { id: sub.organizationId },
        data: { subscriptionStatus: 'EXPIRED' }
      });
      return res.status(402).json({
        success: false,
        error: 'Your subscription has expired. Please renew your plan to continue.',
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

export const requireProPlan = async (req: Request, res: Response, next: NextFunction) => {
  const sub = (req as any).subscription;
  
  if (req.user?.role === 'SUPERADMIN') {
    return next();
  }

  if (!sub) {
    return res.status(403).json({ success: false, error: 'Subscription required' });
  }

  if (sub.plan === 'BASIC' || sub.plan === 'STRICT_BASIC') {
    return res.status(403).json({ 
      success: false, 
      error: 'This feature requires the Pro plan.',
      code: 'UPGRADE_REQUIRED_PRO'
    });
  }

  next();
};
