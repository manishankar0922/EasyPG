import 'express-async-errors';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/requestLogger';
import { startWorkers, serverAdapter } from './config/queue';
import prisma from './config/db';

process.on('unhandledRejection', (reason: any) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (error: any) => {
  console.error('⚠️ Uncaught Exception:', error?.message || error);
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
app.use('/api/v1/admin/queues', serverAdapter.getRouter());

// OpenAPI Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EasyPG SaaS API Documentation',
      version: '1.0.0',
      description: 'Production API specification for EasyPG property management solutions.',
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
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health endpoints
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health/db', async (req: Request, res: Response) => {
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
app.use('/api/v1/auth', authRoutes);

// STEP 7 — Protected routes (auth required)
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/admissions', admissionRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/superadmin', superadminRoutes);
app.use('/api/v1/rent-ledger', rentLedgerRoutes);
app.use('/api/v1/vacate-notices', vacateNoticeRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

// STEP 8 — 404 handler (after all routes)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'POST /api/v1/auth/login',
      'GET /api/v1/health',
      'GET /api/v1/health/db',
      'POST /api/v1/superadmin/organisations',
      'GET /api/v1/dashboard/:branchId',
      'GET /api/v1/tenants',
      'POST /api/v1/tenants',
      'POST /api/v1/payments/record',
    ]
  });
});

// STEP 9 — Global error handler (must be LAST)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
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
}

export default app;
