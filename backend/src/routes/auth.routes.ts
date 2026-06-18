import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/db'
import { authLimiter } from '../middlewares/rateLimiter'
import { requireAuth, requireRole } from '../middlewares/auth.middleware'
import {
  accountLockoutMiddleware,
  recordFailedAttempt,
  clearLockout,
} from '../middlewares/accountLockout.middleware'

// Dummy hash used for timing-safe comparison when user does not exist.
// Without this, an attacker can determine valid emails by measuring response time:
//   - Invalid email  → returns in ~1ms  (no bcrypt comparison)
//   - Valid email    → returns in ~200ms (bcrypt comparison)
// By always running bcrypt.compare, response time is constant regardless of email validity.
const DUMMY_HASH = '$2b$12$dummyhashfortimingnormalizationi8Ge5SomeTrulyRandomDataXXX';

const router = Router()

// POST /api/v1/auth/login
// Rate limited to 5 attempts/15 min per IP (authLimiter)
// Account locked after 5 per-account failures (accountLockoutMiddleware)
router.post('/login',
  authLimiter,
  accountLockoutMiddleware, // Check if this account is currently locked
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Intentionally no console.log — do not log emails or credentials

      const { email, password } = req.body

      // Validate presence
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' })
      }

      // Validate types (prevent object injection attacks: { email: { $gt: '' } })
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid input format' })
      }

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
        const lockResult = recordFailedAttempt(identifier);

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
      clearLockout(identifier);

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
      })

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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name, email, password,
        phone, organisationId
      } = req.body

      if (!name || !email || !password || !organisationId) {
        return res.status(400).json({ success: false, error: 'name, email, password, organisationId are required' })
      }

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

export default router
