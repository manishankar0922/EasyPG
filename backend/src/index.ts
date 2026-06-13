import 'express-async-errors';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/requestLogger';
import { startWorkers, serverAdapter } from './config/queue';
import prisma from './config/db';

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

dotenv.config();

const app = express();

// Trust proxy for rate limiting behind reverse proxies (Render, Heroku, etc.)
app.set('trust proxy', 1);

// STEP 1 — Security headers (must be first)
app.use(helmet());

// STEP 2 — CORS (must be before routes)
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// STEP 3 — Handle preflight OPTIONS requests
app.options('*', cors());

// STEP 4 — Body parsers (must be before routes)
app.use(json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// STEP 5 — Request logger
app.use(requestLogger);

// Initialize Background Workers
if (process.env.NODE_ENV !== 'test') {
  startWorkers();
}

// Queue Monitor
app.use('/api/admin/queues', serverAdapter.getRouter());

// Health endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const counts = {
      users: await prisma.user.count(),
      organisations: await prisma.organization.count(),
      branches: await prisma.branch.count(),
      rooms: await prisma.room.count(),
      beds: await prisma.bed.count(),
      tenants: await prisma.tenant.count(),
    };
    return res.json({
      status: 'healthy',
      database: 'connected',
      counts
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// STEP 6 — Public routes (no auth needed)
app.use('/api/auth', authRoutes);

// STEP 7 — Protected routes (auth required)
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/rent-ledger', rentLedgerRoutes);
app.use('/api/vacate-notices', vacateNoticeRoutes);
app.use('/api/subscription', subscriptionRoutes);

// STEP 8 — 404 handler (after all routes)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'POST /api/auth/login',
      'GET /api/health',
      'GET /api/health/db',
      'POST /api/superadmin/organisations',
      'GET /api/dashboard/:branchId',
      'GET /api/tenants',
      'POST /api/tenants',
      'POST /api/payments/record',
    ]
  });
});

// STEP 9 — Global error handler (must be LAST)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 EasyPG Server Running
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Port:     ${PORT}
  Mode:     ${process.env.NODE_ENV}
  DB:       ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Missing'}
  JWT:      ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}
  Frontend: ${process.env.FRONTEND_URL}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
