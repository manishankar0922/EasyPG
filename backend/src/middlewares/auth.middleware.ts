import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import prisma from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        role: 'OWNER' | 'WARDEN';
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    
    // Developer bypass for local testing
    if (process.env.NODE_ENV === 'development' && 
        process.env.ENABLE_MOCK_AUTH === 'true' && 
        token === 'mock-dev-token') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001', // Should match a profile in DB
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'OWNER',
      };
      return next();
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // Fetch user profile from Prisma to get organizationId and role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return res.status(403).json({ success: false, error: 'Forbidden: Profile not found' });
    }

    req.user = {
      id: profile.id,
      organizationId: profile.organizationId,
      role: profile.role,
    };

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
