import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { updateOrganizationSchema } from '../schemas/organization.schema';
import { z } from 'zod';
import { QueueService } from '../config/queue';

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

  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: { name, ownerName, ownerPhone }
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    await tx.subscription.create({
      data: {
        organizationId: newOrg.id,
        plan: 'PRO',
        status: 'TRIAL',
        trialEndsAt
      }
    });

    return newOrg;
  });

  res.status(201).json({ success: true, data: org });
});

// Get organization by ID
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
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
router.patch('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), validate(updateOrganizationSchema), async (req, res) => {
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

  await QueueService.addOrgSetupJob({
    organizationId,
    branches
  });

  res.status(202).json({ 
    success: true, 
    message: 'Setup queued successfully. It may take a few moments for all branches, rooms, and beds to be available.'
  });
});

export default router;
