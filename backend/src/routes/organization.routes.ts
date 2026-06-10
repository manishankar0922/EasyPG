import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { updateOrganizationSchema } from '../schemas/organization.schema';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

// Create Organization (Internal/Admin Onboarding)
router.post('/', validate(z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    ownerName: z.string().min(2).max(100),
    ownerPhone: z.string().min(10).max(20),
  })
})), async (req, res) => {
  const { name, ownerName, ownerPhone } = req.body;

  const org = await prisma.organization.create({
    data: { name, ownerName, ownerPhone }
  });

  res.status(201).json({ success: true, data: org });
});

// Get organization by ID
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const { organizationId } = req.user!;
  const targetId = req.params.id as string;

  if (organizationId !== targetId) {
    return res.status(403).json({ success: false, error: 'Unauthorized to view this organization' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: targetId }
  });
  
  if (!org) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  
  res.json({ success: true, data: org });
});

// Update organization details
router.patch('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), validate(updateOrganizationSchema), async (req, res) => {
  const { organizationId, role } = req.user!;
  const targetId = req.params.id as string;
  
  if (role !== 'OWNER' || organizationId !== targetId) {
    return res.status(403).json({ success: false, error: 'Unauthorized to update organization details' });
  }

  const { name, ownerName, ownerPhone } = req.body;
  
  const updatedOrg = await prisma.organization.update({
    where: { id: targetId },
    data: { name, ownerName, ownerPhone }
  });
  
  res.json({ success: true, data: updatedOrg });
});

// Smart Organisation Setup Wizard (Bulk create branches, rooms, and beds)
router.post('/setup-wizard', validate(z.object({
  body: z.object({
    branches: z.array(z.object({
      name: z.string().min(2),
      address: z.string().optional(),
      floors: z.array(z.object({
        floorNumber: z.number().int().min(0),
        roomCount: z.number().int().min(1),
        bedsPerRoom: z.number().int().min(1)
      }))
    })).min(1)
  })
})), async (req, res) => {
  const { organizationId, role } = req.user!;
  const { branches } = req.body;

  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized to use setup wizard' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdBranches = await Promise.all(
      branches.map(async (branch: any) => {
        const newBranch = await tx.branch.create({
          data: {
            name: branch.name,
            address: branch.address,
            floors: branch.floors.length,
            organizationId
          }
        });

        for (const floor of branch.floors) {
          for (let i = 1; i <= floor.roomCount; i++) {
            const roomNumber = `${floor.floorNumber}-${i.toString().padStart(2, '0')}`;
            const newRoom = await tx.room.create({
              data: {
                roomNumber,
                floor: floor.floorNumber,
                totalCapacity: floor.bedsPerRoom,
                rentAmount: 0, // Default to 0, to be updated later
                organizationId,
                branchId: newBranch.id
              }
            });

            const bedData = Array.from({ length: floor.bedsPerRoom }).map((_, idx) => ({
              bedNumber: `${roomNumber}-${String.fromCharCode(65 + idx)}`, // 1-01-A, 1-01-B
              roomId: newRoom.id,
              organizationId
            }));
            await tx.bed.createMany({ data: bedData });
          }
        }
        return newBranch;
      })
    );
    return createdBranches;
  });

  res.status(201).json({ success: true, data: result });
});

export default router;
