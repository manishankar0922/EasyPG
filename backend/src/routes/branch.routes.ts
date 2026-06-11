import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createBranchSchema, updateBranchSchema } from '../schemas/branch.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// Get all branches with basic occupancy data
router.get('/', async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId },
    include: {
      _count: {
        select: { rooms: true }
      },
      rooms: {
        select: {
          totalCapacity: true,
          occupiedCapacity: true
        }
      }
    }
  });

  const formattedBranches = branches.map(branch => {
    const totalCapacity = branch.rooms.reduce((acc, room) => acc + room.totalCapacity, 0);
    const occupiedCapacity = branch.rooms.reduce((acc, room) => acc + room.occupiedCapacity, 0);
    
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      roomCount: branch._count.rooms,
      totalCapacity,
      occupiedCapacity,
      occupancyPercentage: totalCapacity > 0 ? (occupiedCapacity / totalCapacity) * 100 : 0
    };
  });

  res.json({ success: true, data: formattedBranches });
});

// Get single branch with detailed occupancy
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const branchId = req.params.id as string;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId },
    include: {
      rooms: true
    }
  });

  if (!branch) return res.status(404).json({ success: false, error: 'Branch not found' });

  const totalCapacity = branch.rooms.reduce((acc, room) => acc + room.totalCapacity, 0);
  const occupiedCapacity = branch.rooms.reduce((acc, room) => acc + room.occupiedCapacity, 0);

  res.json({ 
    success: true, 
    data: {
      ...branch,
      totalCapacity,
      occupiedCapacity,
      occupancyPercentage: totalCapacity > 0 ? (occupiedCapacity / totalCapacity) * 100 : 0
    } 
  });
});

// GET /branches/:id/stats
router.get('/:id/stats', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const branchId = req.params.id as string;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId },
    include: {
      rooms: {
        include: {
          admissions: { where: { status: 'ACTIVE' } }
        }
      }
    }
  });

  if (!branch) return res.status(404).json({ success: false, error: 'Branch not found' });

  const stats = {
    totalRooms: branch.rooms.length,
    totalCapacity: branch.rooms.reduce((acc, r) => acc + r.totalCapacity, 0),
    occupiedCapacity: branch.rooms.reduce((acc, r) => acc + r.occupiedCapacity, 0),
    revenue: branch.rooms.reduce((acc, r) => acc + Number(r.rentAmount) * r.occupiedCapacity, 0), // Simplified revenue estimate
  };

  res.json({ success: true, data: stats });
});

// Create branch
router.post('/', validate(createBranchSchema), async (req, res) => {
  const { name, address, floors } = req.body;
  const orgId = req.user!.organizationId;
  
  if (!orgId) {
    return res.status(403).json({ success: false, error: 'System administrators cannot create branches' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { maxBranches: true }
  });

  if (!org) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }

  const currentCount = await prisma.branch.count({
    where: { organizationId: orgId }
  });

  if (currentCount >= org.maxBranches) {
    return res.status(403).json({
      success: false,
      error: `Branch limit reached (${org.maxBranches}). Please contact the system administrator to upgrade your subscription.`
    });
  }

  try {
    const branch = await prisma.$transaction(async (tx) => {
      const newBranch = await tx.branch.create({
        data: {
          name,
          address,
          organizationId: orgId,
          floors: floors && floors.length > 0 ? floors.length : 1
        }
      });

      if (floors && Array.isArray(floors) && floors.length > 0) {
        for (const floor of floors) {
          for (let r = 1; r <= floor.roomCount; r++) {
            const paddedIndex = r.toString().padStart(2, '0');
            const roomName = `${floor.floorNumber}-${paddedIndex}`;

            let roomType: any = 'CUSTOM';
            if (floor.bedsPerRoom === 1) roomType = 'SINGLE';
            if (floor.bedsPerRoom === 2) roomType = 'DOUBLE';
            if (floor.bedsPerRoom === 3) roomType = 'TRIPLE';
            if (floor.bedsPerRoom === 4) roomType = 'FOUR_SHARE';

            const newRoom = await tx.room.create({
              data: {
                organizationId: orgId,
                branchId: newBranch.id,
                roomNumber: roomName,
                floor: floor.floorNumber,
                totalCapacity: floor.bedsPerRoom,
                roomType: roomType,
                rentAmount: 5000, // Default rent for bulk setup
                genderType: 'BOYS' // Default gender for bulk setup
              }
            });

            const bedData = [];
            for (let b = 1; b <= floor.bedsPerRoom; b++) {
              const bedLetter = String.fromCharCode(64 + b);
              bedData.push({
                organizationId: orgId,
                roomId: newRoom.id,
                bedNumber: `Bed ${bedLetter}`
              });
            }

            if (bedData.length > 0) {
              await tx.bed.createMany({ data: bedData });
            }
          }
        }
      }

      return newBranch;
    });

    res.status(201).json({ success: true, data: branch });
  } catch (err: any) {
    console.error('Transaction failed during branch setup:', err);
    res.status(500).json({ success: false, error: 'Database transaction failed while configuring floor inventory' });
  }
});

// Update branch
router.patch('/:id', validate(updateBranchSchema), async (req, res) => {
  const { name, address } = req.body;
  const branchId = req.params.id as string;
  const branch = await prisma.branch.updateMany({
    where: { id: branchId, organizationId: req.user!.organizationId as string },
    data: { name, address }
  });
  
  if (branch.count === 0) return res.status(404).json({ success: false, error: 'Branch not found' });
  
  res.json({ success: true, message: 'Branch updated successfully' });
});

// Delete branch
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const branchId = req.params.id as string;
  const orgId = req.user!.organizationId as string;

  // Check if branch has rooms before deleting (optional but safer)
  const roomsCount = await prisma.room.count({
    where: { branchId, organizationId: orgId }
  });

  if (roomsCount > 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot delete branch with existing rooms. Please delete or move rooms first.' 
    });
  }

  const result = await prisma.branch.deleteMany({
    where: { id: branchId, organizationId: orgId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'Branch not found' });
  
  res.json({ success: true, message: 'Branch deleted' });
});

// Smart Room Directory
router.get('/:id/rooms', async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const branchId = req.params.id as string;
    const { floor, status, sortBy } = req.query;

    if (req.user!.role === 'WARDEN' && req.user!.branchId !== branchId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other branches' });
    }

    const whereClause: any = {
      organizationId: orgId,
      branchId: branchId,
    };

    if (floor) whereClause.floor = Number(floor);
    if (status === 'VACANT') whereClause.occupiedCapacity = 0;
    if (status === 'FULL') whereClause.occupiedCapacity = { gt: 0 }; 

    let rooms = await prisma.room.findMany({
      where: whereClause,
      include: { beds: true }
    });

    if (status === 'FULL') rooms = rooms.filter(r => r.occupiedCapacity === r.totalCapacity);
    if (status === 'PARTIAL') rooms = rooms.filter(r => r.occupiedCapacity > 0 && r.occupiedCapacity < r.totalCapacity);

    if (sortBy === 'vacancy') {
      rooms.sort((a, b) => (a.occupiedCapacity / a.totalCapacity) - (b.occupiedCapacity / b.totalCapacity));
    } else if (sortBy === 'rent') {
      rooms.sort((a, b) => Number(a.rentAmount) - Number(b.rentAmount));
    } else {
      rooms.sort((a, b) => a.floor - b.floor);
    }

    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

// Owner Dashboard Heatmap
router.get('/:id/heatmap', async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const branchId = req.params.id as string;

    if (req.user!.role === 'WARDEN' && req.user!.branchId !== branchId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rooms = await prisma.room.findMany({
      where: { organizationId: orgId, branchId: branchId },
      include: { beds: true, admissions: { where: { status: 'ACTIVE' }, include: { tenant: true, bed: true } } },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
    });

    const heatmapData = rooms.reduce((acc: any, room) => {
      if (!acc[room.floor]) acc[room.floor] = [];
      
      let status = 'INACTIVE';
      if (room.status !== 'INACTIVE') {
        if (room.occupiedCapacity === 0) status = 'VACANT';
        else if (room.occupiedCapacity === room.totalCapacity) status = 'FULL';
        else status = 'PARTIAL';
      }

      acc[room.floor].push({
        roomId: room.id,
        roomName: room.roomNumber,
        totalBeds: room.totalCapacity,
        occupiedBeds: room.occupiedCapacity,
        status,
        hasAC: room.hasAC,
        tenants: (room as any).admissions.map((a: any) => ({
          ...a.tenant,
          bedName: a.bed?.name || a.bed?.bedNumber || ''
        }))
      });
      return acc;
    }, {});

    const floorsArray = Object.keys(heatmapData).map(floor => ({
      floor: Number(floor),
      rooms: heatmapData[floor]
    }));

    res.json({ success: true, data: floorsArray });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate heatmap' });
  }
});

export default router;
