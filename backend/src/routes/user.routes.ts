import { Router } from 'express';
import prisma from '../config/db';
import { supabaseAdmin } from '../config/supabase';
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

// Create user (Hierarchical: OWNER creates anyone, WARDEN creates STAFF)
router.post('/', validate(createProfileSchema), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  const { email, password: providedPassword, name, phone, role: targetRole } = req.body;

  // 1. Hierarchy Check
  if (currentUserRole === 'WARDEN' && targetRole !== 'STAFF') {
    return res.status(403).json({ success: false, error: 'Wardens can only create Staff members' });
  }

  if (currentUserRole !== 'OWNER' && currentUserRole !== 'WARDEN') {
    return res.status(403).json({ success: false, error: 'Unauthorized to create users' });
  }

  // 2. Set Default Password if not provided
  let password = providedPassword;
  if (!password) {
    if (targetRole === 'WARDEN') password = 'warden@123';
    else if (targetRole === 'STAFF') password = 'staff@123';
    else password = 'user@123';
  }

  try {
    // 3. Create User in Supabase using Admin SDK (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, organizationId }
    });

    if (authError || !authData.user) {
      return res.status(400).json({ success: false, error: authError?.message || 'Failed to create auth user' });
    }

    // 4. Create Profile in Prisma
    const profile = await prisma.profile.create({
      data: {
        id: authData.user.id,
        name,
        phone,
        role: targetRole,
        organizationId
      }
    });

    res.status(201).json({ 
      success: true, 
      message: `User created with default password: ${password}`,
      data: profile 
    });

  } catch (err: any) {
    console.error('User Creation Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
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
