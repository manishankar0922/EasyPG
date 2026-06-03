import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { addPaymentSchema } from '../schemas/financial.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// List payments / History
router.get('/', async (req, res) => {
  const { invoiceId, tenantId } = req.query;
  const orgId = req.user!.organizationId;

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      ...(invoiceId && { invoiceId: invoiceId as string }),
      ...(tenantId && { invoice: { tenantId: tenantId as string } }),
    },
    include: {
      invoice: { include: { tenant: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: payments });
});

// Alias for history
router.get('/history', async (req, res) => {
  const orgId = req.user!.organizationId;
  const payments = await prisma.payment.findMany({
    where: { organizationId: orgId },
    include: { invoice: { include: { tenant: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit for history
  });
  res.json({ success: true, data: payments });
});

// Get single payment
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const paymentId = req.params.id as string;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId: req.user!.organizationId },
    include: { invoice: { include: { tenant: true } } }
  });

  if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
  res.json({ success: true, data: payment });
});

// Add payment
router.post('/', validate(addPaymentSchema), async (req, res) => {
  const { invoiceId, amount, paymentMode, paymentDate } = req.body;
  const orgId = req.user!.organizationId;

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice || invoice.organizationId !== orgId) throw new Error('Invoice not found');

    const payment = await tx.payment.create({
      data: {
        organizationId: orgId,
        invoiceId,
        amount,
        paymentMode,
        paymentDate: new Date(paymentDate)
      }
    });

    const totalPaid = invoice.payments.reduce((acc, p) => acc + Number(p.amount), 0) + Number(amount);
    let newStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PARTIAL';
    
    if (totalPaid >= Number(invoice.amount)) {
      newStatus = 'PAID';
    } else if (totalPaid === 0) {
      newStatus = 'UNPAID';
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus }
    });

    return payment;
  });

  res.status(201).json({ success: true, data: result });
});

// Basic Report
router.get('/report', async (req, res) => {
  const orgId = req.user!.organizationId;
  const { startDate, endDate } = req.query;

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      ...(startDate && endDate && {
        paymentDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        }
      })
    }
  });

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  
  res.json({
    success: true,
    data: {
      count: payments.length,
      totalCollected,
      payments
    }
  });
});

export default router;
