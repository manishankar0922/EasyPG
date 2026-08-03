import 'express-async-errors';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { json } from 'express';
import dotenv from 'dotenv';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/requestLogger';
import logger from './lib/logger';
import { startWorkers, serverAdapter } from './config/queue';
import { generalLimiter, paymentLimiter, uploadLimiter, superadminWriteLimiter, userAwareLimiter } from './middlewares/rateLimiter';
import { requireAuth, requireRole } from './middlewares/auth.middleware';
import { sanitizeBodyMiddleware } from './middlewares/sanitizeBody.middleware';
import { helmetConfig, additionalSecurityHeaders } from './middlewares/securityHeaders.middleware';
import { ipBlacklistMiddleware, honeypotTrap } from './middlewares/ipBlacklist.middleware';
import { strictContentTypeMiddleware } from './middlewares/strictContentType.middleware';
import prisma from './config/db';

process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  logger.error('Unhandled Promise Rejection', { message: msg });
});

process.on('uncaughtException', (error: any) => {
  logger.error('Uncaught Exception', { message: error?.message || error });
});

// Import all routers
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import organizationRoutes from './routes/organization.routes';
import branchRoutes from './routes/branch.routes';
import roomRoutes from './routes/room.routes';
import tenantRoutes from './routes/tenant.routes';
import admissionRoutes from './routes/admission.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import superadminRoutes from './routes/superadmin.routes';
import rentLedgerRoutes from './routes/rent-ledger.routes';
import vacateNoticeRoutes from './routes/vacate-notice.routes';
import subscriptionRoutes from './routes/subscription.routes';
import complaintRoutes from './routes/complaint.routes';
import tenantAuthRoutes from './routes/tenant-auth.routes';
import tenantPortalRoutes from './routes/tenant-portal.routes';

dotenv.config();

// SECURITY: Fail fast if NODE_ENV is invalid. Never default to a permissive mode.
const VALID_ENVIRONMENTS = ['development', 'production', 'test'];
if (!process.env.NODE_ENV || !VALID_ENVIRONMENTS.includes(process.env.NODE_ENV)) {
  console.error(`❌ FATAL: NODE_ENV must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
  console.error(`   Got: ${process.env.NODE_ENV || 'undefined'}`);
  process.exit(1);
}

const app = express();

// Trust proxy for rate limiting behind reverse proxies (Render, Heroku, etc.)
app.set('trust proxy', 1);

// STEP 0.5 — IP Blacklisting (Application WAF)
// Drops requests from banned IPs instantly before any processing
app.use(ipBlacklistMiddleware);

// STEP 0.6 — Honeypot routes for automated vulnerability scanners
app.all(['/.env', '/.git', '/wp-admin', '/admin.php', '/config.json'], honeypotTrap);

// STEP 1 — Hardened security headers (CSP, HSTS, Permissions-Policy, Cache-Control)
app.use(helmetConfig);
app.use(additionalSecurityHeaders);

// STEP 2 — CORS (must be before routes)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://u9pgs-ui.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check exact matches
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    const originUrl = new URL(origin);

    // Allow *.localhost for local testing
    if (originUrl.hostname.endsWith('.localhost') || originUrl.hostname === 'localhost') {
      return callback(null, true);
    }

    // Allow subdomains/prefixes of the production frontend URL
    if (process.env.FRONTEND_URL) {
      try {
        const frontendUrlObj = new URL(process.env.FRONTEND_URL);
        const frontendHost = frontendUrlObj.hostname;
        const originUrlObj = new URL(origin);
        const originHost = originUrlObj.hostname;

        // SECURITY (audit #7): every check is ANCHORED — exact equality or a true
        // subdomain suffix. `startsWith` was exploitable: an attacker-controlled
        // host like `admin-<frontendHost>.attacker.com` passed the old check.
        const isMatched = originHost === frontendHost ||
          originHost.endsWith(`.${frontendHost}`) ||
          originHost === `admin-${frontendHost}` ||
          originHost === `dev-${frontendHost}` ||
          originHost === `tenant-${frontendHost}` ||
          originHost === `tenet-${frontendHost}` ||
          originHost.endsWith('.vercel.app');

        if (isMatched && originUrlObj.protocol === frontendUrlObj.protocol) {
          return callback(null, true);
        }
      } catch (e) {
        // Fall back to exact match check
      }
    }

    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// STEP 3 — Handle preflight OPTIONS requests
app.options('*', cors());

import compression from 'compression';

// STEP 4 — Body parsers (must be before routes)
app.use(json({ limit: '2mb' })); // Reduced from 10mb — images go through Cloudinary, not here
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// STEP 4.5 — Response compression
app.use(compression({ threshold: 1024 }));

// STEP 4.5.5 — Strict Content Type Validation
// Rejects malformed requests (like URL-encoded JSON bypasses)
app.use('/api', strictContentTypeMiddleware);

// STEP 4.6 — Global rate limiting on all /api/* routes
app.use('/api/', generalLimiter);

// STEP 4.7 — HPP (HTTP Parameter Pollution) — blocks ?role=staff&role=admin attacks
// Attackers can send duplicate params; hpp keeps only the last value (safe default)
app.use(hpp());

// STEP 4.8 — Prototype pollution guard
// Blocks __proto__, constructor, prototype keys in req.body that could corrupt Object prototype
app.use((req: Request, _res: Response, next) => {
  if (req.body && typeof req.body === 'object') {
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerous) {
      if (key in req.body) {
        delete req.body[key];
      }
    }
  }
  next();
});

// STEP 4.9 — Global XSS/Injection sanitization (runs before all route handlers)
// Strips script tags, event handlers, javascript: URIs from all POST/PATCH/PUT body strings
app.use(sanitizeBodyMiddleware);

// STEP 5 — Request logger
app.use(requestLogger);

// Initialize Background Workers
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  startWorkers();
}

// Queue Monitor
app.use('/api/v1/admin/queues', serverAdapter.getRouter());

// Prometheus Metrics
import client from 'prom-client';
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'u9pgs_' });

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'u9pgs_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ route: req.route ? req.route.path : req.path, code: res.statusCode, method: req.method });
  });
  next();
});

// Metrics endpoint — protected: only SuperAdmins can access Prometheus data
app.get('/metrics', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// OpenAPI Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'U9PGs SaaS API Documentation',
      version: '1.0.0',
      description: 'Production API specification for U9PGs property management solutions.',
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
// SECURITY: Swagger disabled in production. Use offline documentation (Postman, OpenAPI spec file) instead.
// Swagger endpoint is a reconnaissance vector and rate-limit bypass.
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Health endpoints
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// DB health — protected: internal DB counts must not be exposed publicly
app.get('/api/v1/health/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // Only return counts in development; production exposes minimal info
    const isDev = process.env.NODE_ENV !== 'production';
    const counts = isDev ? {
      users: await prisma.user.count(),
      organisations: await prisma.organization.count(),
      branches: await prisma.branch.count(),
      rooms: await prisma.room.count(),
      beds: await prisma.bed.count(),
      tenants: await prisma.tenant.count(),
    } : undefined;
    return res.json({
      status: 'healthy',
      database: 'connected',
      ...(isDev && { counts })
    });
  } catch {
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected'
      // Never leak error.message in production — it may contain connection string details
    });
  }
});

// STEP 6 — Public routes (no auth needed)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admissions', admissionRoutes);
app.use('/api/v1/tenant-auth', tenantAuthRoutes);
app.use('/api/v1/tenant-portal', userAwareLimiter, tenantPortalRoutes);

// STEP 7 — Protected routes (auth required)
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/admissions', admissionRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentLimiter, paymentRoutes); // extra rate limiting on payments
// userAwareLimiter: compound IP+userId so each account has its own dashboard quota
app.use('/api/v1/dashboard', userAwareLimiter, dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadLimiter, uploadRoutes); // strict rate limiting on uploads
app.use('/api/v1/superadmin', superadminWriteLimiter, superadminRoutes); // hourly limit on superadmin writes
app.use('/api/v1/rent-ledger', userAwareLimiter, rentLedgerRoutes);
app.use('/api/v1/vacate-notices', vacateNoticeRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/complaints', userAwareLimiter, complaintRoutes);

// STEP 8 — 404 handler (after all routes)
// NOTE: Do NOT leak availableRoutes — it's a roadmap for attackers
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'The requested resource was not found.'
  });
});

// STEP 9 — Global error handler (must be LAST)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚀 U9PGs Server Running
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Port:     ${PORT}
    Mode:     ${process.env.NODE_ENV}
    DB:       ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Missing'}
    JWT:      ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}
    Frontend: ${process.env.FRONTEND_URL}
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // ── KEEP-ALIVE SELF-PING ─────────────────────────────────────────────
    // Render free tier spins down after 15 minutes of inactivity.
    // This ping fires every 14 minutes to keep the process alive,
    // preventing the 30–60s cold-start delay that breaks login/logout.
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
      const PING_URL = `${process.env.RENDER_EXTERNAL_URL}/api/v1/health`;
      setInterval(async () => {
        try {
          const response = await fetch(PING_URL, { method: 'GET', signal: AbortSignal.timeout(5000) });
          if (!response.ok) logger.warn(`⚠️ Keep-alive ping failed: ${response.status}`);
        } catch (err: any) {
          logger.warn(`⚠️ Keep-alive ping error: ${err.message}`);
        }
      }, 14 * 60 * 1000); // Every 14 minutes
      logger.info(`🔔 Keep-alive ping active → ${PING_URL}`);
    }
    // ──────────────────────────────────────────────────────────────────────
  });

  // Graceful shutdown — disconnect Prisma before process exits
  // Prevents zombie Postgres connections on Render restarts
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Disconnecting Prisma...`);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;

