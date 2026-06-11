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
  const { invoiceId, tenantId, month, branchId: branchIdQuery } = req.query;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;
  const branchId = userBranchId || branchIdQuery;

  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
      ...(invoiceId && { invoiceId: invoiceId as string }),
      ...(tenantId && { invoice: { tenantId: tenantId as string } }),
      ...(month === 'current' && { paymentDate: { gte: currentMonthStart } }),
      ...(branchId && { invoice: { tenant: { admissions: { some: { room: { branchId: branchId as string }, status: 'ACTIVE' } } } } })
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
router.post('/', async (req, res) => {
  const { invoiceId, tenantId, amount, mode, paymentMode, date, paymentDate, note } = req.body;
  const orgId = req.user!.organizationId;

  // Normalize parameters
  const finalPaymentMode = mode || paymentMode || 'CASH';
  const finalPaymentDate = new Date(date || paymentDate || new Date());
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      let targetInvoiceId = invoiceId;

      // If tenantId is provided instead of invoiceId, find/create the current month's invoice
      if (tenantId && !targetInvoiceId) {
        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const currentMonthString = currentMonthStart.toISOString().substring(0, 7); // e.g. "2024-05"

        let invoice = await tx.invoice.findFirst({
          where: { tenantId, organizationId: orgId, createdAt: { gte: currentMonthStart } },
          include: { payments: true }
        });

        if (!invoice) {
          // If no invoice exists for this month, find their rent amount and create one
          const admission = await tx.admission.findFirst({
            where: { tenantId, organizationId: orgId, status: 'ACTIVE' }
          });
          if (!admission) throw new Error("No active admission to create an invoice for");

          invoice = await tx.invoice.create({
            data: {
              organizationId: orgId,
              tenantId,
              month: currentMonthString,
              amount: admission.monthlyRent,
              dueDate: new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), 5),
              status: 'UNPAID'
            },
            include: { payments: true }
          });
        }
        targetInvoiceId = invoice.id;
      }

      if (!targetInvoiceId) throw new Error("Either invoiceId or tenantId must be provided");

      const invoice = await tx.invoice.findUnique({
        where: { id: targetInvoiceId },
        include: { payments: true }
      });

      if (!invoice || invoice.organizationId !== orgId) throw new Error('Invoice not found');

      const payment = await tx.payment.create({
        data: {
          organizationId: orgId,
          invoiceId: targetInvoiceId,
          amount,
          paymentMode: finalPaymentMode,
          paymentDate: finalPaymentDate,
          // note is not in schema but can be added if needed, omitting for now
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
        where: { id: targetInvoiceId },
        data: { status: newStatus }
      });

      return payment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Payment error:', error);
    res.status(400).json({ success: false, error: error.message || 'Payment failed' });
  }
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
