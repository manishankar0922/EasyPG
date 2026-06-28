import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/db';
import { tenantAuthLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import { accountLockoutMiddleware, recordFailedAttempt, clearLockout } from '../middlewares/accountLockout.middleware';

// ─── INPUT SCHEMA ─────────────────────────────────────────────────────────────────
/**
 * tenantLoginSchema — strict Zod schema for POST /tenant-auth/login
 *  - phone: 10-digit Indian mobile number; trimmed of formatting chars by handler
 *  - password: 4-digit pin (Aadhaar last4 or phone last4); max 10 to handle edge cases
 *  - .strict(): rejects any extra fields (prevents parameter injection, OWASP API3)
 */
const tenantLoginSchema = z.object({
  phone: z.string({ error: 'Phone is required' })
    .min(10, 'Phone number too short')
    .max(15, 'Phone number too long'),  // allow +91XXXXXXXXXX format
  password: z.string({ error: 'Password is required' })
    .min(1, 'Password is required')
    .max(10, 'Password too long'),       // tenant pin is 4 digits; cap at 10
}).strict();

const router = Router();

// POST /api/v1/tenant-auth/login
// tenantAuthLimiter:  IP-based, max 5 per 15 min
// accountLockoutMiddleware: account-based, locks after 5 consecutive failures
// validate(tenantLoginSchema): strict type+length validation (OWASP API3)
router.post('/login',
  tenantAuthLimiter,
  accountLockoutMiddleware,
  validate(tenantLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.body is already validated+typed by tenantLoginSchema.
      // phone and password are guaranteed to be strings of valid length.
      const { phone, password } = req.body;

      // Removed manual type+presence checks — validate() handles these.

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
          status: 'ACTIVE',
          OR: [
            { phone: sanitizedPhone },
            { phone: `+91${sanitizedPhone}` },
            { phone: `91${sanitizedPhone}` }
          ]
        },
        include: { 
          organization: {
            include: { subscription: true }
          }
        }
      });

      // Timing Attack Prevention: if tenant doesn't exist, simulate a ~10ms DB delay
      if (!tenant) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Fallback: If aadhaarLast4 is empty/missing, the password is the last 4 digits of the phone number
      const expectedPassword = (tenant?.aadhaarLast4 && tenant.aadhaarLast4.trim() !== '') 
        ? tenant.aadhaarLast4.trim() 
        : tenant?.phone.slice(-4);

      const isValidPassword = expectedPassword && password.trim() === expectedPassword;

      if (!tenant || !isValidPassword) {
        // Record failed attempt for account lockout tracking
        const lockResult = await recordFailedAttempt(sanitizedPhone);

        if (lockResult.locked) {
          return res.status(423).json({
            success: false,
            error: 'Account temporarily locked due to too many failed login attempts.',
            lockedUntil: lockResult.lockedUntil?.toISOString(),
          });
        }

        return res.status(401).json({
          success: false,
          error: 'Invalid phone number or password',
        });
      }

      if (tenant.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'Tenant account is not active'
        });
      }

      // Subscription Logic Gating: Tenant App is a PRO/ENTERPRISE/TRIAL feature
      const org = tenant.organization;
      const sub = org.subscription;
      
      // If there's no subscription record yet, we can assume they are on the legacy ACTIVE trial/pro
      // But let's check the new subscription table primarily.
      const status = sub?.status || org.subscriptionStatus;
      const plan = sub?.plan || org.subscriptionPlan;
      
      // Allow if they are in TRIAL (Check both status and plan for legacy compatibility)
      const isTrial = status === 'TRIAL' || plan === 'TRIAL';
      
      // Allow if they are ACTIVE and on PRO or ENTERPRISE
      const isProOrEnterprise = status === 'ACTIVE' && 
                               (plan === 'PRO' || plan === 'ENTERPRISE');

      if (!isTrial && !isProOrEnterprise) {
        return res.status(403).json({
          success: false,
          error: 'Tenant Login is a PRO feature. Ask your PG owner to upgrade their plan.'
        });
      }

      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET missing from .env!');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }
      const JWT_SECRET = process.env.JWT_SECRET;

      // ✅ Login successful — clear lockout state
      clearLockout(sanitizedPhone);

      // ── SESSION HIJACKING PREVENTION (FINGERPRINTING) ──
      const userAgent = req.headers['user-agent'] || 'unknown';
      const fingerprint = crypto.createHash('sha256').update(userAgent).digest('hex');

      const token = jwt.sign(
        {
          userId: tenant.id, // using userId field to reuse existing auth middlewares
          tenantId: tenant.id,
          role: 'TENANT',
          organisationId: tenant.organizationId,
          fingerprint,
        },
        JWT_SECRET,
        { 
          expiresIn: '30d', // 30 days for mobile app convenience
          issuer: 'u9pgs-api',    // iss claim
          audience: 'u9pgs-app',  // aud claim
        }
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
      // SECURITY: Do not log raw error in production — may leak internal stack/DB state
      if (process.env.NODE_ENV !== 'production') {
        console.error('Tenant Login error:', error);
      }
      next(error);
    }
  }
);

export default router;
