import { ClerkExpressRequireAuth, StrictAuthProp } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: string;
        organizationId: string;
        branchId: string | null;
      };
      auth: StrictAuthProp['auth'];
    }
  }
}

// Step 1: Verify Clerk token (with Developer Bypass & Supabase Fallback)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // Developer bypass for local testing
  if (process.env.ENABLE_MOCK_AUTH === 'true') {
    if (authHeader && authHeader.startsWith('Bearer mock-')) {
      // Mock auth bypasses Clerk verification
      (req as any).auth = { userId: authHeader.split('Bearer ')[1] };
      return next();
    }
  }
  
  // JWT Fallback for Supabase & Admin Impersonation
  if (authHeader && authHeader.split('.').length === 3) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      
      // Try verifying with Supabase secret or Custom JWT secret
      const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'easypg-super-secret-key-123';
      
      const decoded = jwt.verify(token, secret);
      const userId = decoded.sub || decoded.id;
      
      if (userId) {
        (req as any).auth = { userId };
        return next();
      }
    } catch (e) {
      // Ignore and fall through to Clerk
    }
  }
  
  // Normal Clerk Verification
  if (!process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token and Clerk API keys are missing' });
  }
  
  return ClerkExpressRequireAuth()(req, res, next);
};

// Step 2: Attach user + org context
export const attachUserContext = async (
  req: Request, res: Response, next: NextFunction
) => {
  try {
    let clerkUserId = req.auth?.userId;
    
    // For mock auth
    if (process.env.ENABLE_MOCK_AUTH === 'true' && clerkUserId?.startsWith('mock-')) {
      let profile;
      
      if (clerkUserId === 'mock-dev-token' || clerkUserId === 'mock-admin-token') {
        try {
          // Just fetch the first available owner profile to mock the session
          profile = await prisma.profile.findFirst({ where: { role: 'OWNER' } }) || await prisma.profile.findFirst();
        } catch (dbErr) {
          console.warn('Mock auth: DB connection failed, using offline fallback profile');
        }
        
        // If DB is completely empty, provide an ultimate fallback mock profile
        if (!profile) {
          profile = {
            id: (clerkUserId === 'mock-admin-token' || clerkUserId === 'mock-dev-token')
              ? '11111111-1111-1111-1111-111111111111'
              : '22222222-2222-2222-2222-222222222222',
            role: (clerkUserId === 'mock-admin-token' || clerkUserId === 'mock-dev-token')
              ? 'SUPERADMIN'
              : 'OWNER',
            organizationId: '00000000-0000-0000-0000-000000000000',
            branchId: null,
          } as any;
        } else if (clerkUserId === 'mock-admin-token' || clerkUserId === 'mock-dev-token') {
          // Force SUPERADMIN role for both admin and dev tokens even if an OWNER profile was loaded
          profile = { ...profile, role: 'SUPERADMIN' };
        }
      } else {
        const mockProfileId = clerkUserId.replace('mock-user-token-', '');
        // Only query if it's a valid UUID length to avoid Prisma crash
        if (mockProfileId.length === 36) {
          profile = await prisma.profile.findUnique({
            where: { id: mockProfileId },
          });
        }
      }
      
      if (profile) {
        req.user = {
          id: profile.id,
          role: profile.role === 'SUPERADMIN' ? 'SUPER_ADMIN' : profile.role,
          organizationId: profile.organizationId || '00000000-0000-0000-0000-000000000000',
          branchId: profile.branchId,
        };
        return next();
      } else {
        return res.status(401).json({ error: 'Mock profile not found in database' });
      }
    }

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }
    
    // Assuming 'Profile' model handles users. If clerkId isn't on profile, we match by id.
    // In many Clerk migrations, id is mapped directly, or a clerkId column is added.
    const user = await prisma.profile.findFirst({
      where: { 
        // If you added clerkId: clerkId: clerkUserId
        // But for safety, fallback to id if clerkId doesn't exist yet
        OR: [
          { id: clerkUserId },
          // { clerkId: clerkUserId } // Add this once clerkId exists in prisma schema
        ]
      } as any,
      include: { organization: true, branch: true } 
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User profile not found in database' });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account deactivated. Contact your owner.' });
    }
    
    if ((user.role === 'WARDEN' || (user.role as any) === 'warden') && !user.branchId) {
      return res.status(403).json({ error: 'No branch assigned. Contact your admin.' });
    }

    // Attach to request — available in all route handlers
    req.user = {
      id: user.id,
      role: user.role === 'SUPERADMIN' ? 'SUPER_ADMIN' : user.role,
      organizationId: user.organizationId as string,
      branchId: user.branchId
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

// Step 3: Role guard middleware
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };

// Step 4: Branch isolation guard
export const requireBranchAccess = async (
  req: Request, res: Response, next: NextFunction
) => {
  const branchId = req.params.branchId || req.body.branchId || req.query.branchId;
  
  if (!branchId) return next();
  
  // Admin can access any branch
  if (req.user.role === 'admin' || req.user.role === 'SUPER_ADMIN') return next();
  
  // Owner can access their own branches only
  if (req.user.role === 'owner' || req.user.role === 'OWNER') {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: req.user.organizationId as string }
    });
    if (!branch) {
      return res.status(403).json({ error: 'Branch access denied.' });
    }
    return next();
  }
  
  // Warden can only access assigned branch
  if (req.user.branchId !== branchId) {
    return res.status(403).json({ error: 'Branch access denied.' });
  }
  
  next();
};

export const authMiddleware = [requireAuth, attachUserContext, requireBranchAccess];
