import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { checkSubscription } from '../middlewares/subscription.middleware';

import { CacheService } from '../services/cache';
import { z } from 'zod';
import { validate } from '../middlewares/validation.middleware';

const querySchema = z.object({
  branchId: z.string().min(1).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).optional()
});

const router = Router();
router.use(authMiddleware);
router.use(checkSubscription);

// Resolve which branch a dashboard query is scoped to.
// OWNER/SUPERADMIN: org-wide by default, optionally narrowed via ?branchId=
// (pass nothing or 'all' for every branch). WARDEN: always their own branch —
// requireBranchAccess has already rejected any cross-branch ?branchId=.
const effectiveBranchId = (req: any): string | undefined => {
  const { role, branchId: userBranchId } = req.user!;
  const q = typeof req.query.branchId === 'string' && req.query.branchId !== 'all' && req.query.branchId !== ''
    ? req.query.branchId
    : undefined;
  if (role === 'OWNER' || role === 'SUPERADMIN') return q;
  return userBranchId || undefined;
};

// GET /dashboard/overview
router.get('/overview', validate(z.object({ query: querySchema })), async (req, res) => {
  const { role, organizationId: orgId } = req.user!;
  const branchId = effectiveBranchId(req);

  const cacheKey = `dashboard:overview:${orgId}:${role}:${branchId || 'all'}`;
  const cachedData = await CacheService.get(cacheKey);
  if (cachedData) {
    return res.json({ success: true, data: cachedData });
  }

  const roomAgg = await prisma.room.aggregate({
    where: {
      organizationId: orgId,
      ...(branchId && { branchId })
    },
    _count: true,
    _sum: {
      totalCapacity: true,
      occupiedCapacity: true
    }
  });
  const total_rooms = roomAgg._count || 0;
  const total_capacity = roomAgg._sum.totalCapacity || 0;
  const occupied_capacity = roomAgg._sum.occupiedCapacity || 0;

  const total_tenants = await prisma.tenant.count({
    where: {
      organizationId: orgId,
      status: 'ACTIVE',
      ...(branchId && {
        admissions: { some: { room: { branchId }, status: 'ACTIVE' } }
      })
    }
  });

  const invoiceAgg = await prisma.invoice.aggregate({
    where: {
      organizationId: orgId,
      ...(branchId && {
        tenant: { admissions: { some: { room: { branchId } } } }
      })
    },
    _sum: { amount: true }
  });
  const total_invoiced = Number(invoiceAgg._sum.amount || 0);

  const paymentAgg = await prisma.payment.aggregate({
    where: {
      organizationId: orgId,
      ...(branchId && {
        invoice: { tenant: { admissions: { some: { room: { branchId } } } } }
      })
    },
    _sum: { amount: true }
  });
  const total_collected = Number(paymentAgg._sum.amount || 0);

  const responseData = {
    total_rooms,
    total_capacity,
    occupied_capacity,
    vacant_capacity: total_capacity - occupied_capacity,
    occupancy_percentage: total_capacity > 0 ? (occupied_capacity / total_capacity * 100).toFixed(2) : 0,
    total_tenants,
    total_invoiced,
    total_collected,
    total_pending: total_invoiced - total_collected
  };

  await CacheService.set(cacheKey, responseData, 60);

  res.json({
    success: true,
    data: responseData
  });
});

// GET /dashboard/mobile-home
router.get('/mobile-home', validate(z.object({ query: querySchema })), async (req, res) => {
  const { role, organizationId: orgId } = req.user!;
  // Fix: an OWNER with a non-null branchId was silently pinned to that branch
  // here while /overview stayed org-wide — inconsistent dashboard numbers.
  const branchId = effectiveBranchId(req);

  const cacheKey = `dashboard:mobile-home:${orgId}:${role}:${branchId || 'all'}`;
  const cachedData = await CacheService.get(cacheKey);
  if (cachedData) {
    return res.json({ success: true, data: cachedData });
  }

  try {
    // 1. Total Tenants & Rent Pending & Collected
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // We get all admissions that are active
    const activeAdmissions = await prisma.admission.findMany({
      where: {
        status: 'ACTIVE',
        room: {
          organizationId: orgId,
          ...(branchId && { branchId })
        }
      },
      select: {
        monthlyRent: true,
        checkinDate: true,
        room: { select: { roomNumber: true } },
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
            rentLedgers: {
              where: {
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
              },
              select: {
                totalDue: true,
                paidAmount: true,
                status: true
              }
            }
          }
        }
      }
    });

    let pendingRentAmount = 0;
    let pendingRentTenantsCount = 0;
    let collectedAmount = 0;
    let collectedTenantsCount = 0;
    let hasOverdue = false;
    const pendingTenants: any[] = [];

    activeAdmissions.forEach(admission => {
      const currentLedger = admission.tenant.rentLedgers && admission.tenant.rentLedgers[0];
      
      if (currentLedger) {
        collectedAmount += currentLedger.paidAmount;
        if (currentLedger.paidAmount >= currentLedger.totalDue) {
          collectedTenantsCount++;
        }

        const pending = currentLedger.totalDue - currentLedger.paidAmount;
        if (pending > 0) {
          if (currentLedger.status === 'OVERDUE') hasOverdue = true;
          pendingRentAmount += pending;
          pendingRentTenantsCount++;
          pendingTenants.push({
            id: admission.tenant.id,
            name: admission.tenant.name,
            phone: admission.tenant.phone,
            photoUrl: admission.tenant.photoUrl,
            roomNumber: admission.room.roomNumber,
            rentPending: pending
          });
        }
      } else {
        const rentAmount = Number(admission.monthlyRent);
        pendingRentAmount += rentAmount;
        pendingRentTenantsCount++;
        
        pendingTenants.push({
          id: admission.tenant.id,
          name: admission.tenant.name,
          phone: admission.tenant.phone,
          photoUrl: admission.tenant.photoUrl,
          roomNumber: admission.room.roomNumber,
          rentPending: rentAmount
        });
      }
    });

    // 2. Empty Beds
    const branchRooms = await prisma.room.findMany({
      where: { 
        organizationId: orgId, 
        status: 'ACTIVE',
        ...(branchId && { branchId })
      },
      select: {
        totalCapacity: true,
        occupiedCapacity: true
      }
    });

    let emptyBeds = 0;
    let roomsWithVacancy = 0;
    
    branchRooms.forEach(room => {
      const vacancy = room.totalCapacity - room.occupiedCapacity;
      if (vacancy > 0) {
        emptyBeds += vacancy;
        roomsWithVacancy++;
      }
    });

    // Sort pending tenants descending by amount and take top 5
    pendingTenants.sort((a, b) => b.rentPending - a.rentPending);
    const topPendingTenants = pendingTenants.slice(0, 5);

    const responseData = {
      rentPending: {
        amount: pendingRentAmount,
        tenantCount: pendingRentTenantsCount,
        status: pendingRentAmount === 0 ? 'PAID' : (hasOverdue ? 'OVERDUE' : 'PENDING')
      },
      collectedThisMonth: {
        amount: collectedAmount,
        tenantCount: collectedTenantsCount
      },
      emptyBeds: {
        count: emptyBeds,
        roomCount: roomsWithVacancy
      },
      totalTenants: {
        count: activeAdmissions.length,
        checkedInThisMonth: activeAdmissions.filter(a => new Date(a.checkinDate) >= currentMonthStart).length
      },
      pendingTenants: topPendingTenants
    };

    await CacheService.set(cacheKey, responseData, 60);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error: any) {
    console.error('Mobile home dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data.' });
  }
});

// GET /dashboard/revenue
router.get('/revenue', validate(z.object({ query: querySchema })), async (req, res) => {
  const { role, organizationId: orgId } = req.user!;
  const branchId = effectiveBranchId(req);

  const cacheKey = `dashboard:revenue:${orgId}:${role}:${branchId || 'all'}`;
  const cachedData = await CacheService.get(cacheKey);
  if (cachedData) {
    return res.json({ success: true, data: cachedData });
  }

  try {
    // PERF: one round trip instead of 12 parallel aggregate queries (each of
    // which carried a 4-level nested join). Fetch 12 months of (date, amount)
    // pairs and bucket by month in JS — payment rows are tiny.
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const payments = await prisma.payment.findMany({
      where: {
        organizationId: orgId,
        paymentDate: { gte: windowStart },
        // NOTE: no status filter — vacated tenants' past payments must still
        // count in historical months, or branch revenue shrinks over time.
        ...(branchId && {
          invoice: { tenant: { admissions: { some: { room: { branchId } } } } }
        })
      },
      select: { paymentDate: true, amount: true },
    });

    // Pre-seed all 12 buckets so empty months render as 0, not gaps
    const revenueByMonth: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueByMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const p of payments) {
      const d = p.paymentDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in revenueByMonth) revenueByMonth[key] += Number(p.amount);
    }

    await CacheService.set(cacheKey, revenueByMonth, 300); // cache for 5 minutes

    res.json({ success: true, data: revenueByMonth });
  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue' });
  }
});

// GET /dashboard/occupancy
router.get('/occupancy', validate(z.object({ query: querySchema })), async (req, res) => {
  const { role, organizationId: orgId } = req.user!;
  const branchId = effectiveBranchId(req);

  const cacheKey = `dashboard:occupancy:${orgId}:${role}:${branchId || 'all'}`;
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  // PERF: select only the two counters we sum — not entire room rows
  const branches = await prisma.branch.findMany({
    where: {
      organizationId: orgId,
      ...(branchId && { id: branchId })
    },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      rooms: { select: { totalCapacity: true, occupiedCapacity: true } }
    }
  });

  const occupancyData = branches.map(b => {
    const total = b.rooms.reduce((acc, r) => acc + r.totalCapacity, 0);
    const occupied = b.rooms.reduce((acc, r) => acc + r.occupiedCapacity, 0);
    return {
      branchName: b.name,
      total,
      occupied,
      percentage: total > 0 ? (occupied / total * 100).toFixed(2) : 0
    };
  });

  await CacheService.set(cacheKey, occupancyData, 60);
  res.json({ success: true, data: occupancyData });
});

// GET /dashboard/pending-payments
router.get('/pending-payments', validate(z.object({ query: querySchema })), async (req, res) => {
  const { role, organizationId: orgId } = req.user!;
  const branchId = effectiveBranchId(req);

  const cacheKey = `dashboard:pending:${orgId}:${role}:${branchId || 'all'}`;
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  // PERF + PRIVACY: was `include: { tenant: true, payments: true }` with no limit —
  // every unpaid invoice ever, carrying full tenant PII (Aadhaar, photos, parent
  // phone) into a reports payload that renders 25 rows. Select only what the
  // report shows and cap the result.
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { not: 'PAID' },
      ...(branchId && {
        tenant: { admissions: { some: { room: { branchId }, status: 'ACTIVE' } } }
      })
    },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      tenant: { select: { name: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 200,
  });

  const formattedPending = pendingInvoices.map(inv => {
    const paid = inv.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    return {
      id: inv.id,
      tenantName: inv.tenant.name,
      amount: inv.amount,
      paid,
      pending: Number(inv.amount) - paid,
      dueDate: inv.dueDate
    };
  });

  await CacheService.set(cacheKey, formattedPending, 60);
  res.json({ success: true, data: formattedPending });
});

export default router;
