import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { checkSubscription } from '../middlewares/subscription.middleware';

import { CacheService } from '../services/cache';

const router = Router();
router.use(authMiddleware);
router.use(checkSubscription);

// GET /dashboard/overview
router.get('/overview', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;
  
  const cacheKey = `dashboard:overview:${orgId}:${role}:${userBranchId || 'all'}`;
  const cachedData = await CacheService.get(cacheKey);
  if (cachedData) {
    return res.json({ success: true, data: cachedData });
  }

  const roomAgg = await prisma.room.aggregate({ 
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && { branchId: userBranchId })
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
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } }
      })
    } 
  });

  const invoiceAgg = await prisma.invoice.aggregate({ 
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      })
    },
    _sum: { amount: true }
  });
  const total_invoiced = Number(invoiceAgg._sum.amount || 0);

  const paymentAgg = await prisma.payment.aggregate({
    where: {
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        invoice: { tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } } }
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
router.get('/mobile-home', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;
  const branchIdQuery = req.query.branchId as string;
  const branchId = userBranchId || branchIdQuery;

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
router.get('/revenue', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;
  
  const cacheKey = `dashboard:revenue:${orgId}:${role}:${userBranchId || 'all'}`;
  const cachedData = await CacheService.get(cacheKey);
  if (cachedData) {
    return res.json({ success: true, data: cachedData });
  }

  try {
    const revenueByMonth: Record<string, number> = {};
    const now = new Date();
    
    // Fetch only last 12 months to prevent OOM
    const monthQueries = [];
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;
      
      monthQueries.push(
        prisma.payment.aggregate({
          where: {
            organizationId: orgId,
            paymentDate: { gte: startOfMonth, lte: endOfMonth },
            ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
              invoice: { tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } } }
            })
          },
          _sum: { amount: true }
        }).then(res => {
          revenueByMonth[monthStr] = Number(res._sum.amount || 0);
        })
      );
    }

    await Promise.all(monthQueries);

    await CacheService.set(cacheKey, revenueByMonth, 300); // cache for 5 minutes

    res.json({ success: true, data: revenueByMonth });
  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue' });
  }
});

// GET /dashboard/occupancy
router.get('/occupancy', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const branches = await prisma.branch.findMany({
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && { id: userBranchId })
    },
    include: { rooms: true }
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

  res.json({ success: true, data: occupancyData });
});

// GET /dashboard/pending-payments
router.get('/pending-payments', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const pendingInvoices = await prisma.invoice.findMany({
    where: { 
      organizationId: orgId, 
      status: { not: 'PAID' },
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      })
    },
    include: { tenant: true, payments: true },
    orderBy: { dueDate: 'asc' }
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

  res.json({ success: true, data: formattedPending });
});

export default router;
