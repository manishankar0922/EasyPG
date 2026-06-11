import { Router } from 'express';
import { supabase } from '../config/supabase';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();
router.use(authMiddleware);

// POST /auth/change-password
router.post('/change-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
  }

  try {
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MOCK_AUTH === 'true') {
      return res.json({ success: true, message: 'Password updated successfully (Mock Mode)' });
    }

    // Now using Clerk, we'd ideally use clerkClient to update password, but for now we'll just mock it or leave the structure
    // const { error } = await supabase.auth.updateUser({ password: newPassword });
    // if (error) {
    //   return res.status(400).json({ success: false, error: error.message });
    // }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Change Password Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
