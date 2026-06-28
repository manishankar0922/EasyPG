import { Router } from 'express';
import { secureQuery } from '../lib/secureQuery';
import { sanitizeResponse } from '../lib/sanitizeResponse';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { checkSubscription } from '../middlewares/subscription.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createTenantSchema, updateTenantSchema } from '../schemas/tenant.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);
router.use(checkSubscription);

// List tenants with search and filter
router.get('/', async (req, res) => {
  const { search, paymentStatus, newThisMonth } = req.query;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;
  const branchIdQuery = req.query.branchId as string;
  const branchId = userBranchId || branchIdQuery;

  try {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const activeAdmissions = await prisma.admission.findMany({
      skip,
      take: limit,
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
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
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
        include: { 
          payments: {
            include: { 
              recordedBy: { 
                select: { 
                  name: true, 
                  role: true,
                  branch: { select: { name: true } }
                } 
              } 
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      vacateNotice: {
        where: { status: 'PENDING' }
      }
    }
  });

  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, data: tenant });
});

// GET /tenants/:id/history
router.get('/:id/history', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
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

// GET /tenants/:id/ledger
router.get('/:id/ledger', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const { organizationId: orgId } = req.user!;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, organizationId: orgId }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const ledgers = await prisma.rentLedger.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    res.json({ success: true, data: ledgers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch ledger' });
  }
});

// POST /tenants/:id/vacate-notice
router.post('/:id/vacate-notice', validate(z.object({
  params: z.object({ id: z.string().min(5) }),
  body: z.object({
    plannedVacateDate: z.string(),
    reason: z.string().optional()
  })
})), async (req, res) => {
  const tenantId = req.params.id as string;
  const { plannedVacateDate, reason } = req.body;
  const orgId = req.user!.organizationId;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, organizationId: orgId }
    });

    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    // Check if there is already a pending notice
    const existing = await prisma.vacateNotice.findUnique({
      where: { tenantId }
    });

    if (existing && existing.status === 'PENDING') {
      return res.status(400).json({ success: false, error: 'A pending vacate notice already exists.' });
    }

    let notice;
    if (existing) {
      notice = await prisma.vacateNotice.update({
        where: { tenantId },
        data: {
          vacateDate: new Date(plannedVacateDate),
          reason,
          status: 'PENDING',
          createdBy: req.user!.id,
          noticeDate: new Date()
        }
      });
    } else {
      notice = await prisma.vacateNotice.create({
        data: {
          organizationId: orgId,
          tenantId,
          vacateDate: new Date(plannedVacateDate),
          reason,
          createdBy: req.user!.id
        }
      });
    }

    res.json({ success: true, data: notice, message: 'Vacate notice recorded' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to record vacate notice' });
  }
});

// Create tenant
router.post('/', validate(createTenantSchema), async (req, res) => {
  const { 
    name, phone, parentPhone, aadhaarLast4, photoUrl, aadhaarPhotoUrl, collegeName, status,
    roomId, bedId, monthlyRent, checkinDate, depositAmount, pastDues, isVerified
  } = req.body;
  const orgId = req.user!.organizationId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if bed is already occupied to prevent double booking
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed || bed.organizationId !== orgId) throw new Error("Bed not found");
      if (bed.roomId !== roomId) throw new Error("Bed does not belong to the specified room");
      if (bed.isOccupied) throw new Error("Bed is already occupied");

      // Calculate total opening balance for record keeping
      const totalOpeningBalance = pastDues && Array.isArray(pastDues) 
        ? pastDues.reduce((sum, due) => sum + Number(due.amount || 0), 0)
        : 0;

      // 2. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name, phone, parentPhone, aadhaarLast4, photoUrl, aadhaarPhotoUrl, collegeName,
          status: status || 'ACTIVE',
          isVerified: isVerified || false,
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
          openingBalance: totalOpeningBalance,
          status: 'ACTIVE'
        }
      });

      // 3b. Create Arrears Invoices for each past due month
      if (pastDues && Array.isArray(pastDues)) {
        for (const due of pastDues) {
          if (due.amount && Number(due.amount) > 0) {
            await tx.invoice.create({
              data: {
                organizationId: orgId,
                tenantId: tenant.id,
                month: due.month || 'PREVIOUS_ARREARS',
                amount: Number(due.amount),
                dueDate: new Date(),
                status: 'UNPAID'
              }
            });
          }
        }
      }

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
  } catch (error: any) {
    console.error('Tenant creation error:', error);
    
    // Check for specific Prisma errors
    if (error.code === 'P2002') {
      if (error.custom) {
        return res.status(400).json({ success: false, error: error.message });
      }
      const target = error.meta?.target || [];
      const targetStr = Array.isArray(target) ? target.join(', ') : target;
      
      if (targetStr.includes('phone')) {
        return res.status(400).json({ 
          success: false,
          error: 'A tenant with this phone number already exists.' 
        });
      }
      return res.status(400).json({ 
        success: false,
        error: 'Unique constraint failed. This bed may already be assigned, or the data is duplicate.' 
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false,
        error: 'Bed or branch not found.' 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to onboard tenant'
    });
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

      // Resolve any pending VacateNotice
      await tx.vacateNotice.updateMany({
        where: { tenantId, organizationId: orgId, status: 'PENDING' },
        data: { status: 'CONFIRMED', actualVacateDate: new Date() }
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
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const orgId = req.user!.organizationId;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Retrieve the tenant to verify existence and ownership
      const tenant = await tx.tenant.findFirst({
        where: { id: tenantId, organizationId: orgId },
        include: { admissions: { where: { status: 'ACTIVE' } } }
      });

      if (!tenant) {
        throw new Error('NOT_FOUND');
      }

      if (tenant.admissions.length > 0) {
        throw new Error('ACTIVE_ADMISSION');
      }

      // 2. Delete deeply nested dependencies first, ensuring organizationId is enforced where applicable
      // Payment, Invoice, Admission, VacateNotice, SecurityDeposit, Notification, Complaint all have organizationId in the schema.
      // RentLedger does not have organizationId, so we strictly use tenantId which we just verified belongs to the organization.
      await tx.payment.deleteMany({ where: { tenantId, organizationId: orgId } });
      await tx.invoice.deleteMany({ where: { tenantId, organizationId: orgId } });
      await tx.admission.deleteMany({ where: { tenantId, organizationId: orgId } });
      await tx.rentLedger.deleteMany({ where: { tenantId } });
      
      // 3. Delete direct tenant dependencies
      await tx.vacateNotice.deleteMany({ where: { tenantId, organizationId: orgId } });
      await tx.securityDeposit.deleteMany({ where: { tenantId, organizationId: orgId } });
      await tx.notification.deleteMany({ where: { tenantId, organizationId: orgId } });
      await tx.complaint.deleteMany({ where: { tenantId, organizationId: orgId } });
      
      // 4. Finally delete the tenant using delete() instead of deleteMany()
      await tx.tenant.delete({
        where: { id: tenantId }
      });
    });

    res.json({ success: true, message: 'Tenant and related records deleted' });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    if (error.message === 'ACTIVE_ADMISSION') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete tenant with an active admission. Please checkout first.' 
      });
    }
    console.error('Delete tenant error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tenant' });
  }
});

// Auto-Assign Bed
router.post('/auto-assign', validate(z.object({
  body: z.object({
    branchId: z.string().min(5)
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
