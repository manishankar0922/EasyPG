import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware';
import { validate } from '../middlewares/validation.middleware';
import { addPaymentSchema } from '../schemas/financial.schema';
import { z } from 'zod';
import { redlock } from '../jobs/index';

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
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
  const paymentId = req.params.id as string;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId: req.user!.organizationId },
    include: { invoice: { include: { tenant: true } } }
  });

  if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
  res.json({ success: true, data: payment });
});

// Add payment
router.post('/', idempotencyMiddleware, validate(z.object({
  body: z.object({
    invoiceId: z.string().min(5).optional(),
    tenantId: z.string().min(5).optional(),
    amount: z.number().min(1, 'Amount must be greater than 0').max(500000, 'Amount too large'),
    mode: z.enum(['UPI', 'CASH', 'BANK_TRANSFER', 'PHONEPE', 'GPAY']).optional(),
    paymentMode: z.enum(['UPI', 'CASH', 'BANK_TRANSFER', 'PHONEPE', 'GPAY']).optional(),
    date: z.string().optional(),
    paymentDate: z.string().optional(),
    note: z.string().optional()
  }).refine(data => data.invoiceId || data.tenantId, {
    message: "Either invoiceId or tenantId must be provided"
  })
})), async (req, res) => {
  let { invoiceId, tenantId, amount, mode, paymentMode, date, paymentDate, note } = req.body;
  const orgId = req.user!.organizationId;
  const userRole = req.user!.role;
  const userBranchId = req.user!.branchId;

  // Normalize parameters
  let finalPaymentMode = mode || paymentMode || 'CASH';
  if (finalPaymentMode === 'PHONEPE') {
    finalPaymentMode = 'UPI';
    note = note ? `${note} (via PhonePe)` : 'via PhonePe';
  } else if (finalPaymentMode === 'GPAY') {
    finalPaymentMode = 'UPI';
    note = note ? `${note} (via GPay)` : 'via GPay';
  }

  const finalPaymentDate = new Date(date || paymentDate || new Date());
  
  try {
    const lockKey = `payment_lock:${tenantId || invoiceId}`;
    let result;
    
    // Acquire a distributed lock for 10 seconds to prevent race conditions during double clicks
    let lock;
    try {
      lock = await redlock.acquire([lockKey], 10000);
    } catch (err) {
      throw new Error('Another payment is currently being processed for this tenant. Please try again.');
    }

    try {
      result = await prisma.$transaction(async (tx) => {
        let targetInvoiceId = invoiceId;

        // If tenantId is provided instead of invoiceId, find/create the current month's invoice
        if (tenantId && !targetInvoiceId) {
          const dateObj = new Date();
          const currentYear = dateObj.getFullYear();
          const currentMonthNum = dateObj.getMonth() + 1;
          const currentMonthString = `${currentYear}-${currentMonthNum.toString().padStart(2, '0')}`;
          const currentMonthStart = new Date(currentYear, currentMonthNum - 1, 1);

          let invoice = await tx.invoice.findFirst({
            where: { tenantId, organizationId: orgId, createdAt: { gte: currentMonthStart } },
            include: { payments: true }
          });

          if (!invoice) {
            // If no invoice exists for this month, find their rent amount and create one
            const admission = await tx.admission.findFirst({
              where: { tenantId, organizationId: orgId, status: 'ACTIVE' },
              include: { room: true }
            });
            if (!admission) throw new Error("No active admission to create an invoice for");
            if (userRole === 'WARDEN' && admission.room.branchId !== userBranchId) {
              throw new Error("Forbidden: Cannot record payment for tenant in a different branch");
            }

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
          include: { payments: true, tenant: { include: { admissions: { where: { status: 'ACTIVE' }, include: { room: true } } } } }
        });

        if (!invoice || invoice.organizationId !== orgId) throw new Error('Invoice not found');
        
        if (userRole === 'WARDEN') {
          const activeAdmission = invoice.tenant.admissions[0];
          if (activeAdmission && activeAdmission.room.branchId !== userBranchId) {
            throw new Error('Forbidden: Cannot record payment for tenant in a different branch');
          }
        }

        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            invoiceId: targetInvoiceId,
            tenantId: invoice.tenantId,
            amount,
            paymentMode: finalPaymentMode,
            paymentDate: finalPaymentDate,
            recordedById: req.user!.id
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

        // Synchronize with RentLedger so Dashboard accurately reflects payment
        const invoiceYear = parseInt(invoice.month.substring(0, 4));
        const invoiceMonth = parseInt(invoice.month.substring(5, 7));
        
        const rentLedger = await tx.rentLedger.findFirst({
          where: {
            tenantId: invoice.tenantId,
            month: invoiceMonth,
            year: invoiceYear
          }
        });

        const ledgerStatus = newStatus === 'UNPAID' ? 'PENDING' : newStatus;

        if (rentLedger) {
          await tx.rentLedger.update({
            where: { id: rentLedger.id },
            data: {
              paidAmount: { increment: amount },
              status: ledgerStatus as any
            }
          });
        } else {
          await tx.rentLedger.create({
            data: {
              tenantId: invoice.tenantId,
              month: invoiceMonth,
              year: invoiceYear,
              expectedRent: Number(invoice.amount),
              totalDue: Number(invoice.amount),
              paidAmount: amount,
              dueDate: invoice.dueDate,
              status: ledgerStatus as any
            }
          });
        }

        return payment;
      }, {
        maxWait: 15000, // 15s max wait to acquire transaction
        timeout: 20000  // 20s timeout for transaction execution
      });
    } finally {
      if (lock) {
        // @ts-ignore - redlock types might use unlock() or release()
        await lock.release().catch((e: any) => console.warn('Lock release error', e));
      }
    }

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
