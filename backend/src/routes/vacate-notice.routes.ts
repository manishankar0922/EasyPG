import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

// PATCH /api/vacate-notices/:id/confirm
router.patch('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const orgId = req.user!.organizationId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const notice = await tx.vacateNotice.findFirst({
        where: { id, organizationId: orgId, status: 'PENDING' }
      });

      if (!notice) throw new Error('Pending vacate notice not found');

      // Find active admission
      const admission = await tx.admission.findFirst({
        where: { tenantId: notice.tenantId, organizationId: orgId, status: 'ACTIVE' },
        include: { room: true }
      });

      if (!admission) throw new Error("No active admission found for this tenant");

      // Mark tenant as CHECKED_OUT
      await tx.tenant.update({
        where: { id: notice.tenantId },
        data: { status: 'CHECKED_OUT' }
      });

      // Mark admission as COMPLETED
      await tx.admission.update({
        where: { id: admission.id },
        data: { status: 'COMPLETED', checkoutDate: new Date() }
      });

      // Free up bed
      if (admission.bedId) {
        await tx.bed.update({
          where: { id: admission.bedId },
          data: { isOccupied: false }
        });
      }

      // Decrement room occupied capacity
      await tx.room.update({
        where: { id: admission.roomId },
        data: { occupiedCapacity: { decrement: 1 } }
      });

      // Update Notice
      const updatedNotice = await tx.vacateNotice.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          actualVacateDate: new Date()
        }
      });

      return updatedNotice;
    });

    res.json({ success: true, data: result, message: 'Tenant marked as vacated.' });
  } catch (error: any) {
    console.error('Confirm vacate error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to confirm vacate' });
  }
});

// PATCH /api/vacate-notices/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const orgId = req.user!.organizationId;

  try {
    const notice = await prisma.vacateNotice.findFirst({
      where: { id, organizationId: orgId, status: 'PENDING' }
    });

    if (!notice) return res.status(404).json({ success: false, error: 'Pending notice not found' });

    const updated = await prisma.vacateNotice.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ success: true, data: updated, message: 'Notice cancelled.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to cancel notice' });
  }
});

export default router;
