import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

// GET /dashboard/overview
router.get('/overview', async (req, res) => {
  const orgId = req.user!.organizationId;

  const rooms = await prisma.room.findMany({ where: { organizationId: orgId } });
  const total_rooms = rooms.length;
  const total_capacity = rooms.reduce((acc, r) => acc + r.totalCapacity, 0);
  const occupied_capacity = rooms.reduce((acc, r) => acc + r.occupiedCapacity, 0);
  
  const total_tenants = await prisma.tenant.count({ where: { organizationId: orgId, status: 'ACTIVE' } });

  const invoices = await prisma.invoice.findMany({ 
    where: { organizationId: orgId },
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

// GET /dashboard/revenue
router.get('/revenue', async (req, res) => {
  const orgId = req.user!.organizationId;
  
  const payments = await prisma.payment.findMany({
    where: { organizationId: orgId },
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
  const orgId = req.user!.organizationId;

  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId },
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
  const orgId = req.user!.organizationId;

  const pendingInvoices = await prisma.invoice.findMany({
    where: { organizationId: orgId, status: { not: 'PAID' } },
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
