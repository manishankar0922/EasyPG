import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

// GET /dashboard/overview
router.get('/overview', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const rooms = await prisma.room.findMany({ 
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && { branchId: userBranchId })
    } 
  });
  const total_rooms = rooms.length;
  const total_capacity = rooms.reduce((acc, r) => acc + r.totalCapacity, 0);
  const occupied_capacity = rooms.reduce((acc, r) => acc + r.occupiedCapacity, 0);
  
  const total_tenants = await prisma.tenant.count({ 
    where: { 
      organizationId: orgId, 
      status: 'ACTIVE',
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } }
      })
    } 
  });

  const invoices = await prisma.invoice.findMany({ 
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      })
    },
    include: { payments: true }
  });

  let total_invoiced = 0;
  let total_collected = 0;
  invoices.forEach(inv => {
    total_invoiced += Number(inv.amount);
    inv.payments.forEach(p => total_collected += Number(p.amount));
  });

  res.json({
    success: true,
    data: {
      total_rooms,
      total_capacity,
      occupied_capacity,
      vacant_capacity: total_capacity - occupied_capacity,
      occupancy_percentage: total_capacity > 0 ? (occupied_capacity / total_capacity * 100).toFixed(2) : 0,
      total_tenants,
      total_invoiced,
      total_collected,
      total_pending: total_invoiced - total_collected
    }
  });
});

// GET /dashboard/mobile-home
router.get('/mobile-home', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;
  const branchIdQuery = req.query.branchId as string;
  const branchId = userBranchId || branchIdQuery;

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
      include: {
        tenant: true,
        room: true,
        invoices: {
          where: {
            createdAt: { gte: currentMonthStart }
          }
        }
      }
    });

    let pendingRentAmount = 0;
    let pendingRentTenantsCount = 0;
    let collectedAmount = 0;
    let collectedTenantsCount = 0;
    const pendingTenants: any[] = [];

    activeAdmissions.forEach(admission => {
      const currentMonthInvoices = admission.invoices as any[];
      const fullyPaidInvoice = currentMonthInvoices.find(inv => inv.status === 'PAID');
      
      if (fullyPaidInvoice) {
        collectedAmount += Number(fullyPaidInvoice.amount);
        collectedTenantsCount++;
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

    res.json({
      success: true,
      data: {
        rentPending: {
          amount: pendingRentAmount,
          tenantCount: pendingRentTenantsCount
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
      }
    });
  } catch (error: any) {
    console.error('Mobile home dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data.' });
  }
});

// GET /dashboard/revenue
router.get('/revenue', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;
  
  const payments = await prisma.payment.findMany({
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        invoice: { tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } } }
      })
    },
    orderBy: { paymentDate: 'asc' }
  });

  // Group by month
  const revenueByMonth: Record<string, number> = {};
  payments.forEach(p => {
    const month = p.paymentDate.toISOString().substring(0, 7); // YYYY-MM
    revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(p.amount);
  });

  res.json({ success: true, data: revenueByMonth });
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
