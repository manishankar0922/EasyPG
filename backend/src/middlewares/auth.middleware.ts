import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

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
      process.env.JWT_SECRET
    ) as {
      userId: string;
      role: string;
      organisationId: string;
      branchId: string;
    };

    // Mock bypass for dev accounts
    if (decoded.userId === 'mock-admin' || decoded.userId === 'mock-dev') {
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
        branchId: true
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

    // Attach user to request
    req.user = {
      ...user,
      organizationId: user.organisationId
    };
    next();

  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: string[]) =>
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
  // Just pass through or implement your logic
  next();
};

export const authMiddleware = [requireAuth, requireBranchAccess];
