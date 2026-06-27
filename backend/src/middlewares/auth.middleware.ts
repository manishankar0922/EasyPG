import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db';
import { addIpStrike, getClientIp } from './ipBlacklist.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      auth?: { userId: string };
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please login.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET missing from .env!');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer: 'u9pgs-api',    // strictly require valid issuer
        audience: 'u9pgs-app',  // strictly require valid audience
      }
    ) as {
      userId: string;
      role: string;
      organisationId: string;
      branchId: string;
      fingerprint?: string;
    };

    // ── SESSION HIJACKING PREVENTION (FINGERPRINT VERIFICATION) ──
    if (decoded.fingerprint) {
      const userAgent = req.headers['user-agent'] || 'unknown';
      const currentFingerprint = crypto.createHash('sha256').update(userAgent).digest('hex');
      
      if (decoded.fingerprint !== currentFingerprint) {
        // Token was stolen and is being used from a different browser/device
        addIpStrike(getClientIp(req), 'Session Hijacking Attempt (Fingerprint Mismatch)');
        return res.status(401).json({
          success: false,
          error: 'Session hijacking detected or browser changed. Please login again.',
          code: 'FINGERPRINT_MISMATCH'
        });
      }
    }

    // Mock bypass for dev accounts (Strictly limited to non-production)
    if (process.env.NODE_ENV !== 'production' && (decoded.userId === 'mock-admin' || decoded.userId === 'mock-dev')) {
      req.user = {
        id: decoded.userId,
        role: 'SUPERADMIN',
        isActive: true,
        organisationId: null,
        organizationId: null,
        branchId: null
      };
      return next();
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        organisationId: true,
        branchId: true,
        organisation: {
          select: { subscription: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Please login again.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated. Contact admin.'
      });
    }

    let effectivePlan = user.organisation?.subscription?.plan || 'PRO';
    const sub = user.organisation?.subscription;
    
    if (sub) {
      if (sub.status === 'TRIAL') {
        effectivePlan = 'PRO';
      } else if (sub.plan === 'BASIC' && sub.status === 'ACTIVE' && sub.trialEndsAt && new Date() < sub.trialEndsAt) {
        effectivePlan = 'PRO';
      } else if (sub.plan === 'STRICT_BASIC') {
        effectivePlan = 'BASIC';
      }
    }

    // Attach user to request
    req.user = {
      ...user,
      organizationId: user.organisationId,
      plan: effectivePlan,
      underlyingPlan: sub?.plan || 'PRO',
      subscriptionStatus: sub?.status || 'ACTIVE'
    };
    next();

  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: string[]): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required: ${roles.join(' or ')}`
      });
    }
    next();
  };

export const attachUserContext = async (req: Request, res: Response, next: NextFunction) => {
  // Backwards compatibility if needed, but requireAuth now does this.
  next();
};

export const requireBranchAccess = async (req: Request, res: Response, next: NextFunction) => {
  // Only enforce branch restriction for WARDEN and STAFF roles.
  // OWNER, SUPERADMIN, SUPER_ADMIN can access any branch.
  const restrictedRoles = ['WARDEN', 'STAFF'];
  if (!req.user || !restrictedRoles.includes(req.user.role)) {
    return next();
  }

  // If request targets a specific branchId (param or query), verify it matches the user's branch.
  const requestedBranchId = req.params?.branchId || req.query?.branchId;
  if (requestedBranchId && req.user.branchId && requestedBranchId !== req.user.branchId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only access data for your assigned branch.',
      code: 'CROSS_BRANCH_ACCESS_DENIED'
    });
  }

  next();
};

export const authMiddleware = [requireAuth, requireBranchAccess];
