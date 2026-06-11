import { Router } from 'express';
import { secureQuery } from '../lib/secureQuery';
import { sanitizeResponse } from '../lib/sanitizeResponse';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createTenantSchema, updateTenantSchema } from '../schemas/tenant.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// List tenants with search and filter
router.get('/', async (req, res) => {
  const { search, paymentStatus, newThisMonth } = req.query;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;
  const branchIdQuery = req.query.branchId as string;
  const branchId = userBranchId || branchIdQuery;

  try {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const activeAdmissions = await prisma.admission.findMany({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        ...(branchId && { room: { branchId } }),
        ...(newThisMonth === 'true' && { checkinDate: { gte: currentMonthStart } }),
        ...(search && {
          tenant: {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { phone: { contains: search as string } }
            ]
          }
        })
      },
      include: {
        tenant: {
          include: {
            invoices: {
              where: {
                createdAt: { gte: currentMonthStart }
              }
            }
          }
        },
        room: true,
        bed: true,
      },
      orderBy: { checkinDate: 'desc' }
    });

    let formattedTenants = activeAdmissions.map(admission => {
      const currentMonthInvoices = admission.tenant.invoices as any[];
      const fullyPaidInvoice = currentMonthInvoices.find(inv => inv.status === 'PAID');
      
      const isPaid = !!fullyPaidInvoice;
      const rentPending = isPaid ? 0 : Number(admission.monthlyRent);

      return {
        id: admission.tenant.id,
        name: admission.tenant.name,
        photoUrl: admission.tenant.photoUrl,
        roomNumber: admission.room.roomNumber,
        bedName: admission.bed?.bedNumber || '',
        moveInDate: admission.checkinDate,
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        rentPending: rentPending,
      };
    });

    // Apply paymentStatus filter after map
    if (paymentStatus === 'PAID') {
      formattedTenants = formattedTenants.filter(t => t.paymentStatus === 'PAID');
    } else if (paymentStatus === 'UNPAID') {
      formattedTenants = formattedTenants.filter(t => t.paymentStatus === 'UNPAID');
    }

    // Apply search fallback (if roomNumber search is needed, which wasn't caught by DB query)
    if (search) {
      const searchLower = (search as string).toLowerCase();
      formattedTenants = formattedTenants.filter(t => 
        t.name.toLowerCase().includes(searchLower) || 
        t.roomNumber.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: formattedTenants });
  } catch (error: any) {
    console.error('Failed to fetch mobile tenants:', error);
    res.status(500).json({ success: false, error: 'Failed to load tenants' });
  }
});

// Alias for search
router.get('/search', async (req, res) => {
  const { q } = req.query;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;

  const tenants = await prisma.tenant.findMany({
    where: {
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        admissions: {
          some: {
            room: {
              branchId: userBranchId
            }
          }
        }
      }),
      OR: [
        { name: { contains: q as string, mode: 'insensitive' } },
        { phone: { contains: q as string } },
      ]
    }
  });
  res.json({ success: true, data: tenants });
});

// Get single tenant profile and history
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const tenant = await prisma.tenant.findFirst({
    where: { 
      id: tenantId, 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        admissions: {
          some: {
            room: {
              branchId: userBranchId
            }
          }
        }
      })
    },
    include: {
      admissions: {
        include: { room: { include: { branch: true } } },
        orderBy: { createdAt: 'desc' }
      },
      invoices: {
        include: { payments: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, data: tenant });
});

// GET /tenants/:id/history
router.get('/:id/history', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const history = await prisma.admission.findMany({
    where: { 
      tenantId, 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        room: {
          branchId: userBranchId
        }
      })
    },
    include: { room: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: history });
});

// Create tenant
router.post('/', validate(createTenantSchema), async (req, res) => {
  const { 
    name, phone, parentPhone, aadhaarLast4, photoUrl, aadhaarPhotoUrl, collegeName, status,
    roomId, bedId, monthlyRent, checkinDate, depositAmount 
  } = req.body;
  const orgId = req.user!.organizationId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if bed is already occupied to prevent double booking
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed || bed.organizationId !== orgId) throw new Error("Bed not found");
      if (bed.roomId !== roomId) throw new Error("Bed does not belong to the specified room");
      if (bed.isOccupied) throw new Error("Bed is already occupied");

      // 2. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name, phone, parentPhone, aadhaarLast4, photoUrl, aadhaarPhotoUrl, collegeName,
          status: status || 'ACTIVE',
          organizationId: orgId,
        }
      });

      // 3. Create Admission
      const admission = await tx.admission.create({
        data: {
          organizationId: orgId,
          tenantId: tenant.id,
          roomId,
          bedId,
          checkinDate: new Date(checkinDate),
          monthlyRent,
          depositAmount: depositAmount || 0,
          status: 'ACTIVE'
        }
      });

      // 4. Update Bed and Room Occupancy
      await tx.bed.update({
        where: { id: bedId },
        data: { isOccupied: true }
      });

      await tx.room.update({
        where: { id: roomId },
        data: { occupiedCapacity: { increment: 1 } }
      });

      return { tenant, admission };
    });

    res.status(201).json({ success: true, data: result.tenant });
  } catch (err: any) {
    if (err.message === "Bed is already occupied") {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('Create tenant error:', err);
    res.status(500).json({ success: false, error: 'Failed to onboard tenant' });
  }
});

// Update tenant
router.patch('/:id', validate(updateTenantSchema), async (req, res) => {
  const tenantId = req.params.id as string;
  const tenant = await prisma.tenant.updateMany({
    where: { id: tenantId, organizationId: req.user!.organizationId },
    data: req.body
  });

  if (tenant.count === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, message: 'Tenant updated' });
});

// Vacate tenant
router.patch('/:id/vacate', async (req, res) => {
  const tenantId = req.params.id;
  const orgId = req.user!.organizationId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find active admission
      const admission = await tx.admission.findFirst({
        where: { tenantId, organizationId: orgId, status: 'ACTIVE' },
        include: { room: true }
      });

      if (!admission) throw new Error("No active admission found for this tenant");

      // Mark tenant as CHECKED_OUT
      await tx.tenant.update({
        where: { id: tenantId },
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

      return true;
    });

    res.json({ success: true, message: 'Tenant marked as vacated.' });
  } catch (error: any) {
    console.error('Vacate tenant error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to vacate tenant' });
  }
});

// Delete tenant
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const orgId = req.user!.organizationId;

  // Check for active admissions
  const activeAdmissions = await prisma.admission.count({
    where: { tenantId, organizationId: orgId, status: 'ACTIVE' }
  });

  if (activeAdmissions > 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot delete tenant with an active admission. Please checkout first.' 
    });
  }

  const result = await prisma.tenant.deleteMany({
    where: { id: tenantId, organizationId: orgId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, message: 'Tenant deleted' });
});

// Auto-Assign Bed
router.post('/auto-assign', validate(z.object({
  body: z.object({
    branchId: z.string().uuid()
  })
})), async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const { branchId } = req.body;

    if (req.user!.role === 'WARDEN' && req.user!.branchId !== branchId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other branches' });
    }

    // Atomic transaction ensures no two wardens double-book the same bed simultaneously
    const assignedBed = await prisma.$transaction(async (tx) => {
      const availableBed = await tx.bed.findFirst({
        where: {
          isOccupied: false,
          organizationId: orgId,
          room: { branchId: branchId, status: 'ACTIVE' }
        },
        include: { room: true },
        orderBy: [
          { room: { floor: 'asc' } },
          { room: { roomNumber: 'asc' } },
          { bedNumber: 'asc' }
        ]
      });

      if (!availableBed) return null;

      const claimedBed = await tx.bed.update({
        where: { id: availableBed.id },
        data: { isOccupied: true },
        include: { room: true }
      });

      await tx.room.update({
        where: { id: claimedBed.roomId },
        data: { occupiedCapacity: { increment: 1 } }
      });

      return claimedBed;
    });

    if (!assignedBed) {
      return res.status(404).json({ success: false, error: 'No vacant beds available in this branch.' });
    }

    res.json({ 
      success: true, 
      data: {
        bedId: assignedBed.id,
        roomId: assignedBed.roomId,
        roomName: assignedBed.room.roomNumber,
        floorNumber: assignedBed.room.floor
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Auto-assignment system failed' });
  }
});

export default router;
