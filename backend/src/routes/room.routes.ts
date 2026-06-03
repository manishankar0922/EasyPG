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
  const { branchId, status, genderType } = req.query;
  const orgId = req.user!.organizationId;

  const rooms = await prisma.room.findMany({
    where: {
      organizationId: orgId,
      ...(branchId && { branchId: branchId as string }),
      ...(status && { status: status as any }),
      ...(genderType && { genderType: genderType as any }),
    },
    include: { branch: true }
  });
  
  res.json({ success: true, data: rooms });
});

// GET /rooms/availability
router.get('/availability', async (req, res) => {
  const orgId = req.user!.organizationId;
  const rooms = await prisma.room.findMany({
    where: { 
      organizationId: orgId, 
      status: 'ACTIVE',
    },
    include: { branch: true }
  });

  const availableRooms = rooms.filter(r => r.occupiedCapacity < r.totalCapacity);
  res.json({ success: true, data: availableRooms });
});

// GET /rooms/occupancy
router.get('/occupancy', async (req, res) => {
  const orgId = req.user!.organizationId;
  const rooms = await prisma.room.findMany({
    where: { organizationId: orgId },
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
  const room = await prisma.room.findFirst({
    where: { id: roomId, organizationId: req.user!.organizationId },
    include: { 
      branch: true,
      admissions: {
        where: { status: 'ACTIVE' },
        include: { tenant: true }
      }
    }
  });

  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, data: room });
});

// Create room
router.post('/', validate(createRoomSchema), async (req, res) => {
  const { branchId, roomNumber, roomType, totalCapacity, rentAmount, genderType, status } = req.body;
  
  // Verify branch belongs to organization
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: req.user!.organizationId }
  });

  if (!branch) {
    return res.status(400).json({ success: false, error: 'Invalid branch ID' });
  }

  const room = await prisma.room.create({
    data: {
      organizationId: req.user!.organizationId,
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
    where: { id: roomId, organizationId: req.user!.organizationId },
    data: req.body
  });

  if (room.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room updated' });
});

// Block room
router.patch('/:id/block', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const room = await prisma.room.updateMany({
    where: { id: roomId, organizationId: req.user!.organizationId },
    data: { status: 'BLOCKED' }
  });

  if (room.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room blocked' });
});

// Activate room
router.patch('/:id/activate', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const room = await prisma.room.updateMany({
    where: { id: roomId, organizationId: req.user!.organizationId },
    data: { status: 'ACTIVE' }
  });

  if (room.count === 0) return res.status(404).json({ success: false, error: 'Room not found' });
  
  res.json({ success: true, message: 'Room activated' });
});

// Delete room
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const roomId = req.params.id as string;
  const orgId = req.user!.organizationId;

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

export default router;
