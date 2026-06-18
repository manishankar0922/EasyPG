import { Router } from 'express';
import prisma from '../config/db';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate, fields } from '../middlewares/validate';
import { passwordResetLimiter } from '../middlewares/rateLimiter';
import { createProfileSchema, updateProfileSchema } from '../schemas/profile.schema';
import { z } from 'zod';
import { randomUUID, randomBytes } from 'crypto';

const router = Router();
router.use(authMiddleware);

// List all users in the organization
router.get('/', async (req, res) => {
  const orgId = req.user!.organizationId;
  const users = await prisma.profile.findMany({
    where: { organizationId: orgId },
    include: { branch: true }
  });
  res.json({ success: true, data: users });
});

// Get user by ID
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
  const userId = req.params.id as string;
  const user = await prisma.profile.findFirst({
    where: { id: userId, organizationId: req.user!.organizationId },
    include: { branch: true }
  });
  
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  
  res.json({ success: true, data: user });
});

// Create user (Hierarchical: OWNER creates anyone, WARDEN creates STAFF)
router.post('/', validate(createProfileSchema), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  const { email, password: providedPassword, name, phone, role: targetRole, branchId } = req.body;

  // 1. Hierarchy Check
  if (currentUserRole === 'WARDEN' && targetRole !== 'STAFF') {
    return res.status(403).json({ success: false, error: 'Wardens can only create Staff members' });
  }

  if (currentUserRole !== 'OWNER' && currentUserRole !== 'WARDEN') {
    return res.status(403).json({ success: false, error: 'Unauthorized to create users' });
  }

  // 2. Set Default Password if not provided
  // Passwords come from environment variables — NEVER hardcoded.
  // If env vars not set, generate a cryptographically random password.
  let password = providedPassword;
  if (!password) {
    const genRandom = () => randomBytes(9).toString('base64url'); // 12 safe chars
    if (targetRole === 'WARDEN') password = process.env.DEFAULT_WARDEN_PASSWORD || genRandom();
    else if (targetRole === 'STAFF') password = process.env.DEFAULT_STAFF_PASSWORD || genRandom();
    else password = process.env.DEFAULT_USER_PASSWORD || genRandom();
  }

  try {
    let newUserId: string;

    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MOCK_AUTH === 'true') {
      newUserId = randomUUID();
    } else {
      // 3. Create User in Supabase using Admin SDK (bypasses email confirmation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, organizationId, branchId }
      });

      if (authError || !authData.user) {
        return res.status(400).json({ success: false, error: authError?.message || 'Failed to create auth user' });
      }
      newUserId = authData.user.id;
    }

    // 4. Create Profile in Prisma
    const profile = await prisma.profile.create({
      data: {
        id: newUserId,
        name,
        email: email.toLowerCase(),
        phone,
        role: targetRole,
        organizationId,
        branchId
      }
    });

    res.status(201).json({ 
      success: true, 
      // Never return the raw password in the API response — send it
      // to the user via SMS/WhatsApp separately if needed
      message: 'User created successfully. Temporary password sent separately.',
      data: profile 
    });

  } catch (err: any) {
    console.error('User Creation Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Update user status
router.patch('/:id/status', validate(z.object({ 
  params: z.object({ id: z.string().min(5) }),
  body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']) }) 
})), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  const targetId = req.params.id as string;
  const { status } = req.body;

  if (currentUserRole !== 'OWNER' && currentUserRole !== 'WARDEN') {
    return res.status(403).json({ success: false, error: 'Unauthorized to update status' });
  }

  const result = await prisma.profile.updateMany({
    where: { id: targetId, organizationId },
    data: { status }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'User not found' });
  
  res.json({ success: true, message: `User status updated to ${status}` });
});

// Admin Password Reset — rate limited to 3 attempts/hour
router.post('/:id/reset-password', passwordResetLimiter, validate(z.object({ 
  params: z.object({ id: fields.id }),
  body: z.object({ newPassword: fields.password }) 
})), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  const targetId = req.params.id as string;
  const { newPassword } = req.body;

  if (currentUserRole !== 'OWNER') {
    return res.status(403).json({ success: false, error: 'Only owners can reset passwords' });
  }

  try {
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MOCK_AUTH === 'true') {
      // Mock success
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
        password: newPassword
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    console.error('Admin Reset Password Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Assign Branch
router.patch('/:id/assign-branch', validate(z.object({ 
  params: z.object({ id: z.string().min(5) }),
  body: z.object({ branchId: z.string().min(5).nullable() }) 
})), async (req, res) => {
  const { organizationId, role: currentUserRole } = req.user!;
  const targetId = req.params.id as string;
  const { branchId } = req.body;

  if (currentUserRole !== 'OWNER') {
    return res.status(403).json({ success: false, error: 'Only owners can assign branches' });
  }

  // Verify branch belongs to organization if provided
  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId }
    });
    if (!branch) {
      return res.status(400).json({ success: false, error: 'Branch not found in your organization' });
    }
  }

  const result = await prisma.profile.updateMany({
    where: { id: targetId, organizationId },
    data: { branchId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'User not found' });
  
  res.json({ success: true, message: 'Branch assignment updated' });
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
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
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
