import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import prisma from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        branchId?: string | null;
        role: 'SUPER_ADMIN' | 'OWNER' | 'WARDEN' | 'STAFF';
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
        process.env.ENABLE_MOCK_AUTH === 'true') {
      if (token === 'mock-dev-token') {
        req.user = {
          id: '00000000-0000-0000-0000-000000000001',
          organizationId: '00000000-0000-0000-0000-000000000001',
          branchId: null,
          role: 'OWNER',
        };
        return next();
      }
      if (token === 'mock-admin-token') {
        req.user = {
          id: '00000000-0000-0000-0000-000000000000',
          organizationId: '00000000-0000-0000-0000-000000000000',
          branchId: null,
          role: 'SUPER_ADMIN',
        };
        return next();
      }
      if (token.startsWith('mock-user-token-')) {
        const userId = token.replace('mock-user-token-', '');
        const profile = await prisma.profile.findUnique({
          where: { id: userId },
        });
        if (profile) {
          req.user = {
            id: profile.id,
            organizationId: profile.organizationId || '00000000-0000-0000-0000-000000000000',
            branchId: profile.branchId,
            role: profile.role,
          };
          return next();
        }
      }
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

    // Check if account is active
    if (profile.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: `Your account is ${profile.status.toLowerCase()}. Please contact your administrator.` });
    }

    req.user = {
      id: profile.id,
      organizationId: profile.organizationId || '00000000-0000-0000-0000-000000000000',
      branchId: profile.branchId,
      role: profile.role,
    };

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
