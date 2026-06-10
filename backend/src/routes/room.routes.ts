import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createRoomSchema, updateRoomSchema } from '../schemas/room.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// Get all rooms with filtering
router.get('/', async (req, res) => {
  const { branchId, status, genderType, includeBeds } = req.query;
  const orgId = req.user!.organizationId as string;
  const { role, branchId: userBranchId } = req.user!;

  // Branch Isolation: Wardens/Staff can only see their assigned branch
  let effectiveBranchId = branchId as string;
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId) {
    effectiveBranchId = userBranchId;
  }

  const rooms = await prisma.room.findMany({
    where: {
      organizationId: orgId,
      ...(effectiveBranchId && { branchId: effectiveBranchId }),
      ...(status && { status: status as any }),
      ...(genderType && { genderType: genderType as any }),
    },
    include: { 
      branch: true,
      ...(includeBeds === 'true' && { beds: true })
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
  });
  
  res.json({ success: true, data: rooms });
});

// GET /rooms/availability
router.get('/availability', async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const { role, branchId: userBranchId } = req.user!;

  const rooms = await prisma.room.findMany({
    where: { 
      organizationId: orgId, 
      status: 'ACTIVE',
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && { branchId: userBranchId })
    },
    include: { branch: true }
  });

  const availableRooms = rooms.filter(r => r.occupiedCapacity < r.totalCapacity);
  res.json({ success: true, data: availableRooms });
});

// GET /rooms/occupancy
router.get('/occupancy', async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const { role, branchId: userBranchId } = req.user!;

  const rooms = await prisma.room.findMany({
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && { branchId: userBranchId })
    },
    select: { totalCapacity: true, occupiedCapacity: true }
  });

  const total = rooms.reduce((acc, r) => acc + r.totalCapacity, 0);
  const occupied = rooms.reduce((acc, r) => acc + r.occupiedCapacity, 0);

  res.json({ 
    success: true, 
    data: { 
      total, 
      occupied, 
      percentage: total > 0 ? (occupied / total * 100).toFixed(2) : 0 
    } 
  });
});

// Get single room details
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const room = await prisma.room.findFirst({
    where: { 
      id: roomId, 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && { branchId: userBranchId })
    },
    include: { 
      branch: true,
      admissions: {
        where: { status: 'ACTIVE' },
        include: { tenant: true }
      }
    }
  });

  if (!room) return res.status(404).json({ success: false, error: 'Room not found or access denied' });
  
  res.json({ success: true, data: room });
});

// Create room
router.post('/', validate(createRoomSchema), async (req, res) => {
  const { branchId, roomNumber, roomType, totalCapacity, rentAmount, genderType, status } = req.body;
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  if (!orgId) {
    return res.status(403).json({ success: false, error: 'System administrators cannot create rooms' });
  }

  // Branch Isolation Check
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && userBranchId !== branchId) {
    return res.status(403).json({ success: false, error: 'You can only create rooms in your assigned branch' });
  }
  
  // Verify branch belongs to organization
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId }
  });

  if (!branch) {
    return res.status(400).json({ success: false, error: 'Invalid branch ID' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { maxRooms: true }
  });

  if (!org) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }

  const currentCount = await prisma.room.count({
    where: { organizationId: orgId }
  });

  if (currentCount >= org.maxRooms) {
    return res.status(403).json({
      success: false,
      error: `Room limit reached (${org.maxRooms}). Please contact the system administrator to upgrade your subscription.`
    });
  }

  const room = await prisma.room.create({
    data: {
      organizationId: orgId,
      branchId,
      roomNumber,
      roomType,
      totalCapacity,
      rentAmount,
      genderType,
      status: status || 'ACTIVE'
    }
  });
  
  res.status(201).json({ success: true, data: room });
});

// Update room
router.patch('/:id', validate(updateRoomSchema), async (req, res) => {
  const roomId = req.params.id as string;
  const room = await prisma.room.updateMany({
    where: { id: roomId, organizationId: req.user!.organizationId as string },
    data: req.body
  });

  if (room.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room updated' });
});

// Block room
router.patch('/:id/block', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const room = await prisma.room.updateMany({
    where: { id: roomId, organizationId: req.user!.organizationId as string },
    data: { status: 'BLOCKED' }
  });

  if (room.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room blocked' });
});

// Activate room
router.patch('/:id/activate', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const room = await prisma.room.updateMany({
    where: { id: roomId, organizationId: req.user!.organizationId as string },
    data: { status: 'ACTIVE' }
  });

  if (room.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room activated' });
});

// Delete room
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const orgId = req.user!.organizationId as string;

  // Check for active admissions
  const activeAdmissions = await prisma.admission.count({
    where: { roomId, organizationId: orgId, status: 'ACTIVE' }
  });

  if (activeAdmissions > 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot delete room with active admissions. Please checkout or transfer tenants first.' 
    });
  }

  const result = await prisma.room.deleteMany({
    where: { id: roomId, organizationId: orgId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room deleted' });
});

// Room Analytics Panel
router.get('/:id/analytics', async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const roomId = req.params.id as string;

    const room = await prisma.room.findUnique({
      where: { id: roomId, organizationId: orgId },
      include: { 
        beds: true,
        admissions: {
          where: { status: 'ACTIVE' },
          include: { tenant: { include: { invoices: { include: { payments: true } } } } }
        }
      }
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (req.user!.role === 'WARDEN' && req.user!.branchId !== room.branchId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const occupancyRate = room.totalCapacity > 0 ? (room.occupiedCapacity / room.totalCapacity) * 100 : 0;
    
    let expectedRent = 0;
    let collectedRent = 0;
    
    const currentMonth = new Date().toISOString().slice(0, 7); 

    (room as any).admissions.forEach((adm: any) => {
      if (adm.tenant) {
        expectedRent += Number(room.rentAmount);
        
        adm.tenant.invoices.forEach((inv: any) => {
          if (inv.month === currentMonth) {
            const paidForInv = (inv as any).payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
            collectedRent += paidForInv;
          }
        });
      }
    });

    const pendingRent = expectedRent - collectedRent;

    const pastAdmissions = await prisma.admission.findMany({
      where: { roomId, organizationId: orgId, status: 'COMPLETED', checkoutDate: { not: null } }
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const turnoverLast6Months = pastAdmissions.filter(a => a.checkoutDate! > sixMonthsAgo).length;

    let totalStayMonths = 0;
    pastAdmissions.forEach(a => {
      const msDiff = a.checkoutDate!.getTime() - a.checkinDate.getTime();
      totalStayMonths += msDiff / (1000 * 60 * 60 * 24 * 30);
    });

    const avgTenancyMonths = pastAdmissions.length > 0 ? (totalStayMonths / pastAdmissions.length) : 0;

    res.json({
      success: true,
      data: {
        occupancyRate: Math.round(occupancyRate),
        expectedRent,
        collectedRent,
        pendingRent: pendingRent > 0 ? pendingRent : 0,
        avgTenancyMonths: Number(avgTenancyMonths.toFixed(1)),
        turnoverLast6Months
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Analytics calculation failed' });
  }
});

export default router;
