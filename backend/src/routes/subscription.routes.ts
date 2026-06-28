import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { z } from 'zod';
import { fields } from '../middlewares/validate';

const router = Router();
router.use(authMiddleware);

// GET /api/subscription/status
router.get('/status', async (req, res) => {
  const orgId = req.user!.organisationId || req.user!.organizationId;

  if (!orgId) {
    // If SuperAdmin accesses this page, return a mock active subscription so it doesn't crash
    return res.json({
      success: true,
      data: {
        id: 'superadmin-mock',
        organizationId: 'superadmin',
        plan: 'PRO',
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      }
    });
  }

  try {
    let subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId }
    });

    if (!subscription) {
      // Create trial subscription by default if not exists
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14); // 14 days trial

      subscription = await prisma.subscription.create({
        data: {
          organizationId: orgId,
          plan: 'PRO',
          status: 'TRIAL',
          trialEndsAt: trialEnd
        }
      });
    }

    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('Failed to get subscription status', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription status' });
  }
});

const requestSchema = z.object({
  body: z.object({
    plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
    upiRefNumber: z.string().min(5).max(50),
    screenshotUrl: fields.url,
    amount: z.number().optional()
  })
});

// POST /api/subscription/request
router.post('/request', validate(requestSchema), async (req, res) => {
  const orgId = req.user!.organisationId || req.user!.organizationId;
  const { plan, upiRefNumber, screenshotUrl, amount } = req.body;

  if (!orgId) {
    // If SuperAdmin tests the form, mock a success response
    return res.json({ 
      success: true, 
      data: { id: 'mock-req' }, 
      message: 'Mock payment request submitted (SuperAdmin)' 
    });
  }

  // Security Check: Hardcode prices to prevent payload manipulation
  const PLAN_PRICES: Record<string, number> = {
    BASIC: 499,
    PRO: 799,
    ENTERPRISE: 1199
  };

  const validPlan = PLAN_PRICES[plan] ? plan : 'BASIC';
  const secureAmount = PLAN_PRICES[validPlan];

  try {
    const request = await prisma.paymentRequest.create({
      data: {
        organizationId: orgId,
        plan: validPlan,
        amount: secureAmount,
        upiRefNumber,
        screenshotUrl,
        status: 'PENDING'
      }
    });

    res.json({ success: true, data: request, message: 'Payment request submitted' });
  } catch (error: any) {
    console.error('Failed to create payment request', error);
    res.status(500).json({ success: false, error: 'Failed to submit payment request' });
  }
});

export default router;
