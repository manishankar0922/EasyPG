import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { checkInSchema, checkOutSchema, roomTransferSchema } from '../schemas/admission.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// GET /admissions (All)
router.get('/', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;
  
  const admissions = await prisma.admission.findMany({
    where: { 
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        room: { branchId: userBranchId }
      })
    },
    include: { tenant: true, room: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: admissions });
});

// GET /admissions/active
router.get('/active', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const admissions = await prisma.admission.findMany({
    where: { 
      organizationId: orgId, 
      status: 'ACTIVE',
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        room: { branchId: userBranchId }
      })
    },
    include: { tenant: true, room: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: admissions });
});

// GET /admissions/history
router.get('/history', async (req, res) => {
  const { role, branchId: userBranchId, organizationId: orgId } = req.user!;

  const admissions = await prisma.admission.findMany({
    where: { 
      organizationId: orgId, 
      status: 'COMPLETED',
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        room: { branchId: userBranchId }
      })
    },
    include: { tenant: true, room: { include: { branch: true } } },
    orderBy: { checkoutDate: 'desc' }
  });
  res.json({ success: true, data: admissions });
});

// POST /admissions/checkin
router.post('/checkin', validate(checkInSchema), async (req, res) => {
  const { tenantId, roomId, checkinDate, monthlyRent, depositAmount } = req.body;
  const orgId = req.user!.organizationId;

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } });
    if (!room || room.organizationId !== orgId) throw new Error('Room not found');
    if (room.status !== 'ACTIVE') throw new Error('Room is not active');
    if (room.occupiedCapacity >= room.totalCapacity) throw new Error('Room is full');

    const activeAdmission = await tx.admission.findFirst({
      where: { tenantId, organizationId: orgId, status: 'ACTIVE' }
    });
    if (activeAdmission) throw new Error('Tenant already has an active admission');

    await tx.room.update({
      where: { id: roomId },
      data: { occupiedCapacity: { increment: 1 } }
    });

    return tx.admission.create({
      data: {
        organizationId: orgId,
        tenantId,
        roomId,
        checkinDate: new Date(checkinDate),
        monthlyRent,
        depositAmount: depositAmount || 0,
        status: 'ACTIVE'
      }
    });
  });

  res.status(201).json({ success: true, data: result });
});

// POST /admissions/checkout/:id (I'll keep :id in the path as it's cleaner than body)
router.post('/checkout/:id', validate(checkOutSchema), async (req, res) => {
  const { checkoutDate } = req.body;
  const admissionId = req.params.id as string;
  const orgId = req.user!.organizationId;

  const result = await prisma.$transaction(async (tx) => {
    const admission = await tx.admission.findUnique({ 
      where: { id: admissionId },
      include: { room: true }
    });

    if (!admission || admission.organizationId !== orgId) throw new Error('Admission not found');
    if (admission.status !== 'ACTIVE') throw new Error('Admission is not active');

    await tx.room.update({
      where: { id: admission.roomId },
      data: { occupiedCapacity: { decrement: 1 } }
    });

    return tx.admission.update({
      where: { id: admissionId },
      data: { 
        status: 'COMPLETED',
        checkoutDate: new Date(checkoutDate)
      }
    });
  });

  res.json({ success: true, data: result });
});

// POST /admissions/transfer/:id
router.post('/transfer/:id', validate(roomTransferSchema), async (req, res) => {
  const { newRoomId, transferDate } = req.body;
  const admissionId = req.params.id as string;
  const orgId = req.user!.organizationId;

  const result = await prisma.$transaction(async (tx) => {
    const admission = await tx.admission.findUnique({ 
      where: { id: admissionId },
      include: { room: true }
    });

    if (!admission || admission.organizationId !== orgId) throw new Error('Admission not found');
    if (admission.status !== 'ACTIVE') throw new Error('Admission is not active');
    if (admission.roomId === newRoomId) throw new Error('Cannot transfer to the same room');

    const newRoom = await tx.room.findUnique({ where: { id: newRoomId } });
    if (!newRoom || newRoom.organizationId !== orgId) throw new Error('New room not found');
    if (newRoom.status !== 'ACTIVE') throw new Error('New room is not active');
    if (newRoom.occupiedCapacity >= newRoom.totalCapacity) throw new Error('New room is full');

    await tx.room.update({
      where: { id: admission.roomId },
      data: { occupiedCapacity: { decrement: 1 } }
    });

    await tx.room.update({
      where: { id: newRoomId },
      data: { occupiedCapacity: { increment: 1 } }
    });

    return tx.admission.update({
      where: { id: admissionId },
      data: { roomId: newRoomId }
    });
  });

  res.json({ success: true, data: result });
});

export default router;
