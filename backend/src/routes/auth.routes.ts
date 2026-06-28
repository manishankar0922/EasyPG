import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../config/db'
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimiter'
import { validate } from '../middlewares/validate'
import { requireAuth, requireRole } from '../middlewares/auth.middleware'
import {
  accountLockoutMiddleware,
  recordFailedAttempt,
  clearLockout,
} from '../middlewares/accountLockout.middleware'
import { getClientIp } from '../middlewares/ipBlacklist.middleware'
import { logSecurityEvent, SecurityEventType } from '../lib/securityAudit'

// Dummy hash used for timing-safe comparison when user does not exist.
// Without this, an attacker can determine valid emails by measuring response time:
//   - Invalid email  → returns in ~1ms  (no bcrypt comparison)
//   - Valid email    → returns in ~200ms (bcrypt comparison)
// By always running bcrypt.compare, response time is constant regardless of email validity.
const DUMMY_HASH = '$2b$12$dummyhashfortimingnormalizationi8Ge5SomeTrulyRandomDataXXX';

// ─── INPUT SCHEMAS (OWASP API3: Broken Object Property Level Authorization) ───────
// Strict schemas reject unexpected fields and enforce type+length constraints.

/** Schema for POST /login — only email + password, nothing else */
const loginSchema = z.object({
  // Strip whitespace; lower-case; hard cap at 254 (RFC 5321 max)
  email: z.string({ error: 'Email is required' })
    .email('Invalid email address')
    .max(254, 'Email must not exceed 254 characters')
    .toLowerCase()
    .trim(),
  // Hard cap at 128; no regex — we compare a hash, not enforce strength here
  password: z.string({ error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
}).strict(); // .strict() rejects any extra fields (prevents parameter injection)

/** Schema for POST /create-owner */
const createOwnerSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100, 'Name too long').trim(),
  email: z.string().email('Invalid email').max(254).toLowerCase().trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long') // Prevent hashing large inputs (OWASP DoS)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional(),
  organisationId: z.string().cuid('Invalid organisation ID format'),
}).strict()

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254)
}).strict();

const resetPasswordSchema = z.object({
  email: z.string().email().max(254),
  token: z.string(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
}).strict();

const router = Router()

// POST /api/v1/auth/login
// Rate limited to 5 attempts/15 min per IP (authLimiter)
// Account locked after 5 per-account failures (accountLockoutMiddleware)
router.post('/login',
  authLimiter,              // IP-based: max 5 per 15 min — blocks brute-force
  accountLockoutMiddleware, // Account-based: locks after 5 consecutive failures
  validate(loginSchema),    // OWASP API3: strict type/length/format validation
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Intentionally no console.log — do not log emails or credentials

      // req.body is already validated+typed by loginSchema middleware above.
      // Zod has already: verified types, trimmed, lower-cased, enforced lengths.
      const { email, password } = req.body

      // Removed manual type+presence checks — validate() middleware handles these.
      // Zod's .strict() also ensures no extra fields were injected.

      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET missing from .env! Server cannot issue tokens.');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }
      const JWT_SECRET = process.env.JWT_SECRET;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          organisation: { include: { subscription: true } },
          branch: true
        }
      })

      // ── TIMING-SAFE COMPARISON ─────────────────────────────────────────────
      // Always run bcrypt.compare, even if user doesn't exist.
      // This prevents timing-based email enumeration attacks.
      const hashToCompare = user?.passwordHash || DUMMY_HASH;
      const isValid = await bcrypt.compare(password, hashToCompare);
      // ──────────────────────────────────────────────────────────────────────

      const identifier = email.toLowerCase().trim();

      if (!user || !isValid) {
        // Record failed attempt for account lockout tracking
        const lockResult = await recordFailedAttempt(identifier);
        
        await logSecurityEvent({
          eventType: SecurityEventType.LOGIN_FAILURE,
          userId: user ? user.id : undefined,
          req,
          metadata: { identifier, locked: lockResult.locked }
        });

        // Generic error message — never reveal whether email exists or password is wrong
        if (lockResult.locked) {
          return res.status(423).json({
            success: false,
            error: 'Account temporarily locked due to too many failed login attempts.',
            lockedUntil: lockResult.lockedUntil?.toISOString(),
          })
        }

        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          // Hint: how many attempts before lockout (helpful UX, low security risk)
          ...(lockResult.remainingAttempts !== undefined && lockResult.remainingAttempts <= 3 && {
            attemptsRemaining: lockResult.remainingAttempts
          })
        })
      }

      // Check if account is set up
      if (!user.passwordHash) {
        return res.status(401).json({ success: false, error: 'Account not set up. Contact admin.' })
      }

      // Check active status
      if (!user.isActive) {
        return res.status(403).json({ success: false, error: 'Account deactivated. Contact admin.' })
      }

      // ✅ Login successful — clear lockout state
      await clearLockout(identifier);

      // ── SESSION HIJACKING PREVENTION (FINGERPRINTING) ──
      // Hash the User-Agent and embed it in the JWT.
      // If the token is stolen, the attacker must also spoof the exact User-Agent.
      const userAgent = req.headers['user-agent'] || 'unknown';
      const fingerprint = crypto.createHash('sha256').update(userAgent).digest('hex');

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          organisationId: user.organisationId,
          branchId: user.branchId,
          fingerprint,
          tokenVersion: user.tokenVersion,
        },
        JWT_SECRET,
        {
          expiresIn: '7d',
          issuer: 'u9pgs-api',    // iss claim — reject tokens from other issuers
          audience: 'u9pgs-app',  // aud claim — reject tokens for other audiences
        }
      )

      return res.status(200).json({
        success: true,
        token,
        data: { session: { access_token: token } },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          organisationId: user.organisationId,
          branchId: user.branchId,
          // Branch name is used by WhatsApp receipts to show hostel name instead of "U9PGs"
          branchName: user.branch?.name || null,
          // Organisation name as fallback for owners (no specific branch)
          organisationName: user.organisation?.name || null,
          plan: (() => {
            const sub = user.organisation?.subscription;
            if (!sub) return 'PRO';
            if (sub.plan === 'PRO' || sub.plan === 'ENTERPRISE') return sub.plan;
            if (sub.status === 'TRIAL') return 'PRO';
            if (sub.plan === 'BASIC' && sub.status === 'ACTIVE' && sub.trialEndsAt && new Date() < sub.trialEndsAt) {
              return 'PRO'; // First 14 days of paid BASIC plan gets PRO features
            }
            if (sub.plan === 'STRICT_BASIC') return 'BASIC';
            return sub.plan;
          })(),
          subscriptionStatus: user.organisation?.subscription?.status || 'ACTIVE'
        }
      });

      logSecurityEvent({
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: user?.id,
        req
      });

    } catch (error) {
      next(error)
    }
  }
)

// POST /api/v1/auth/create-owner
// Used by superadmin to create owner accounts — PROTECTED: SuperAdmin only
router.post('/create-owner',
  requireAuth,
  requireRole('SUPERADMIN', 'SUPER_ADMIN'),
  validate(createOwnerSchema), // Strict schema: type + length + password complexity
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.body already validated by createOwnerSchema — no need for manual presence checks
      const {
        name, email, password,
        phone, organisationId
      } = req.body

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      const user = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          passwordHash,
          phone,
          role: 'OWNER',
          organisationId,
          isActive: true
        }
      })

      return res.status(201).json({
        success: true,
        userId: user.id,
        message: 'Owner account created'
      })

    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Email already exists' })
      }
      next(error);
    }
  }
)

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: any, res) => {
  res.json({ success: true, data: req.user });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    // Always return success to prevent email enumeration
    const successMsg = { success: true, message: 'If an account exists, a password reset link has been sent.' };

    if (!user || !user.isActive) {
      return res.status(200).json(successMsg);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiresAt }
    });

    logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
      userId: user.id,
      req,
      metadata: { ip: getClientIp(req) }
    });

    // In a real application, you would send an email here with the `resetToken`.
    // await sendEmail(user.email, `Your token is: ${resetToken}`);
    
    res.status(200).json(successMsg);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    if (new Date() > user.resetTokenExpiresAt) {
      return res.status(400).json({ success: false, error: 'Token has expired' });
    }

    const isValidToken = await bcrypt.compare(token, user.resetTokenHash);
    if (!isValidToken) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash, 
        resetTokenHash: null, 
        resetTokenExpiresAt: null,
        tokenVersion: { increment: 1 } // Invalidate existing JWTs
      }
    });

    logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_RESET_SUCCESS,
      userId: user.id,
      req
    });

    res.status(200).json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error) {
    next(error);
  }
});

export default router
