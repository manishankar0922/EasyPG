import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';

const router = Router();
router.use(authMiddleware);

// SECURITY (audit #9): validate payment input — a raw req.body allowed negative
// or non-numeric amounts to corrupt paidAmount and force PAID status.
const payLedgerSchema = z.object({
  amount: z.number({ error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(500000, 'Amount exceeds maximum allowed'),
  mode: z.string().max(30).optional(),
  date: z.string().max(40).optional(),
}).strict();

// PATCH /api/rent-ledger/:ledgerId/pay
router.patch('/:ledgerId/pay', validate(payLedgerSchema), async (req, res) => {
  const ledgerId = String(req.params.ledgerId);
  const { amount } = req.body as { amount: number };

  try {
    const ledger = await prisma.rentLedger.findUnique({
      where: { id: ledgerId },
      include: { tenant: { include: { organization: true } } }
    });

    if (!ledger) {
      return res.status(404).json({ success: false, error: 'Ledger entry not found' });
    }

    // Verify organization
    if (ledger.tenant.organizationId !== req.user!.organizationId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const newPaidAmount = ledger.paidAmount + amount;
    let newStatus = ledger.status;

    if (newPaidAmount >= ledger.totalDue) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL';
    } else if (new Date() > ledger.dueDate && newPaidAmount === 0) {
      newStatus = 'OVERDUE';
    }

    const updatedLedger = await prisma.rentLedger.update({
      where: { id: ledgerId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus
      }
    });

    // Optionally create a Payment record if you want to track transaction history
    // Since we need an InvoiceId for Payment, and we don't have one here, we skip it
    // Or we could adapt the Payment schema. But prompt says "Updates paidAmount, recalculates status"

    res.json({ success: true, data: updatedLedger });
  } catch (error: any) {
    console.error('Failed to pay rent ledger:', error);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

export default router;
