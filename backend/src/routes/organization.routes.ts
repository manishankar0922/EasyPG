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
...

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

export default router;
