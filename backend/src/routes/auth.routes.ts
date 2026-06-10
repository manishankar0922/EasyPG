import { Router } from 'express';
import { supabase } from '../config/supabase';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

// POST /auth/register - Multi-step SaaS registration
router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password, organizationName, ownerName, ownerPhone } = req.body;

  try {
    // 1. Create Supabase User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ success: false, error: authError?.message || 'User creation failed' });
    }

    const userId = authData.user.id;

    // 2. Database Transaction (Atomic Organization + Profile creation)
    const result = await prisma.$transaction(async (tx: any) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          ownerName,
          ownerPhone,
        }
      });

      const profile = await tx.profile.create({
        data: {
          id: userId,
          organizationId: org.id,
          name: ownerName,
          phone: ownerPhone,
          role: 'OWNER',
        }
      });

      return { org, profile };
    });

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Please check your email for verification.',
      data: result 
    });

  } catch (err: any) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  // Mock Authentication Bypass in Development
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MOCK_AUTH === 'true') {
    if (cleanEmail === 'dev@gmail.com' && password === 'dev123') {
      return res.json({
        success: true,
        data: {
          session: {
            access_token: 'mock-dev-token'
          }
        }
      });
    }
    if (cleanEmail === 'admin@gmail.com' && password === 'admin123') {
      return res.json({
        success: true,
        data: {
          session: {
            access_token: 'mock-admin-token'
          }
        }
      });
    }

    // Check if the user exists in database profile
    const profile = await prisma.profile.findFirst({
      where: { email: cleanEmail }
    });

    if (profile) {
      return res.json({
        success: true,
        data: {
          session: {
            access_token: `mock-user-token-${profile.id}`
          }
        }
      });
    }

    return res.status(401).json({ success: false, error: 'Invalid mock credentials or profile not found' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  
  if (error) return res.status(401).json({ success: false, error: error.message });
  
  res.json({ success: true, data });
});

// Logout
router.post('/logout', async (req, res) => {
  await supabase.auth.signOut();
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user (Me)
router.get('/me', authMiddleware, async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.user!.id },
    include: { organization: true }
  });
  
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
  
  res.json({ success: true, data: profile });
});

// Reset Password / Forgot Password - logic handled via Supabase SDK
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, message: 'Password reset email sent' });
});

// POST /auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
  }

  try {
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MOCK_AUTH === 'true') {
      return res.json({ success: true, message: 'Password updated successfully (Mock Mode)' });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Change Password Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
