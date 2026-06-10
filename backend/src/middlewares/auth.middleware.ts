import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import prisma from '../config/db';
import jwt from 'jsonwebtoken';

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
      if (token === 'mock-dev-token' || token === 'mock-admin-token' || token.startsWith('mock-user-token-')) {
        let userId = '';
        if (token === 'mock-dev-token') userId = '00000000-0000-0000-0000-000000000001';
        else if (token === 'mock-admin-token') userId = '00000000-0000-0000-0000-000000000000';
        else userId = token.replace('mock-user-token-', '');

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
    
    // Check for custom JWT (Impersonation)
    const JWT_SECRET = process.env.JWT_SECRET || 'easypg-super-secret-key-123';
    
    let userId = null;

    try {
      // If it's our custom JWT, verify it
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    } catch (e) {
      // Not a custom JWT, fallback to Supabase
    }

    if (!userId) {
      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      }
      userId = user.id;
    }

    // Fetch user profile from Prisma to get organizationId and role
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
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
