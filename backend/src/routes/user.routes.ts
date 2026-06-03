import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createProfileSchema, updateProfileSchema } from '../schemas/profile.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// List all users in the organization
router.get('/', async (req, res) => {
  const orgId = req.user!.organizationId;
  const users = await prisma.profile.findMany({
    where: { organizationId: orgId }
  });
  res.json({ success: true, data: users });
});

// Get user by ID
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const userId = req.params.id as string;
  const user = await prisma.profile.findFirst({
    where: { id: userId, organizationId: req.user!.organizationId }
  });
  
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  
  res.json({ success: true, data: user });
});

// Create user (Warden)
router.post('/', validate(createProfileSchema), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  
  if (currentUserRole !== 'OWNER') {
    return res.status(403).json({ success: false, error: 'Only owners can create users' });
  }

  const { id, name, phone, role } = req.body;

  const user = await prisma.profile.create({
    data: {
      id,
      name,
      phone,
      role,
      organizationId
    }
  });

  res.status(201).json({ success: true, data: user });
});

// Update user
router.patch('/:id', validate(updateProfileSchema), async (req, res) => {
  const { organizationId, role: currentUserRole, id: currentUserId } = req.user!;
  const targetId = req.params.id as string;

  if (currentUserRole !== 'OWNER' && currentUserId !== targetId) {
    return res.status(403).json({ success: false, error: 'Unauthorized to update this user' });
  }

  const result = await prisma.profile.updateMany({
    where: { id: targetId, organizationId },
    data: req.body
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'User not found' });
  
  res.json({ success: true, message: 'User updated successfully' });
});

// Delete user
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  const targetId = req.params.id as string;

  if (currentUserRole !== 'OWNER') {
    return res.status(403).json({ success: false, error: 'Only owners can delete users' });
  }

  const result = await prisma.profile.deleteMany({
    where: { id: targetId, organizationId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'User not found' });

  res.json({ success: true, message: 'User deleted successfully' });
});

export default router;
