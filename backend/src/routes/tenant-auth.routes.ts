import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// POST /api/v1/tenant-auth/login
router.post('/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          error: 'Phone and password required'
        });
      }

      // Security Check 1: Prevent Type-Crash Vulnerability
      if (typeof phone !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid input format'
        });
      }

      // Security Check 2: Sanitize Phone Number (Extract last 10 digits)
      const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);
      
      if (sanitizedPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }

      // Find tenant. We use an OR clause to hit the B-Tree index 
      // whether the DB stored it with or without the country code.
      const tenant = await prisma.tenant.findFirst({
        where: { 
          OR: [
            { phone: sanitizedPhone },
            { phone: `+91${sanitizedPhone}` },
            { phone: `91${sanitizedPhone}` }
          ]
        },
        include: { organization: true }
      });

      if (!tenant) {
        return res.status(401).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Security Check: Password is STRICTLY Aadhaar Last 4 digits
      const providedPassword = password.trim();
      
      if (!tenant.aadhaarLast4) {
        return res.status(403).json({
          success: false,
          error: 'Aadhaar not registered. Please contact Warden to update KYC.'
        });
      }

      if (providedPassword !== tenant.aadhaarLast4) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }

      if (tenant.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'Tenant account is not active'
        });
      }

      const JWT_SECRET = process.env.JWT_SECRET || 'u9pgs-super-secret-key-123';

      const token = jwt.sign(
        {
          userId: tenant.id, // using userId field to reuse existing auth middlewares
          tenantId: tenant.id,
          role: 'TENANT',
          organisationId: tenant.organizationId,
        },
        JWT_SECRET,
        { expiresIn: '30d' } // 30 days for mobile app convenience
      );

      return res.status(200).json({
        success: true,
        token,
        data: { session: { access_token: token } },
        user: {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          role: 'TENANT',
          organisationId: tenant.organizationId
        }
      });
    } catch (error) {
      console.error('Tenant Login error:', error);
      next(error);
    }
  }
);

export default router;
