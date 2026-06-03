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
  const orgId = req.user!.organizationId;
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
  const orgId = req.user!.organizationId;
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
  const orgId = req.user!.organizationId;
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
  const { name, address } = req.body;
  const branch = await prisma.branch.create({
    data: {
      name,
      address,
      organizationId: req.user!.organizationId
    }
  });
  res.status(201).json({ success: true, data: branch });
});

// Update branch
router.patch('/:id', validate(updateBranchSchema), async (req, res) => {
  const { name, address } = req.body;
  const branchId = req.params.id as string;
  const branch = await prisma.branch.updateMany({
    where: { id: branchId, organizationId: req.user!.organizationId },
    data: { name, address }
  });
  
  if (branch.count === 0) return res.status(404).json({ success: false, error: 'Branch not found' });
  
  res.json({ success: true, message: 'Branch updated successfully' });
});

// Delete branch
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const branchId = req.params.id as string;
  const orgId = req.user!.organizationId;

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

export default router;
