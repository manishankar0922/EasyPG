import 'express-async-errors';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/error.middleware';
import { startWorkers, serverAdapter } from './config/queue';

// Routes (to be imported)
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

import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { generalLimiter, authLimiter, paymentLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security & Optimization Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
}));

app.use(compression());

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://easypg.in'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Input sanitization and payload limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize()); // Prevent NoSQL injection attacks (even on Postgres, guards against certain object injections)
app.use(hpp()); // Prevent HTTP Parameter Pollution

app.use(morgan('dev'));
app.use(requestLogger);

// Mount Bull Board (Queue Monitor) - Needs to be before any body parsers if it conflicts, but standard express is fine.
app.use('/api/admin/queues', serverAdapter.getRouter());

// Rate Limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/payments/', paymentLimiter);

// Initialize Background Workers
if (process.env.NODE_ENV !== 'test') {
  startWorkers();
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
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

// Error Middleware
app.use(errorHandler);

// List all registered routes
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log(
      middleware.route.stack[0].method.toUpperCase(),
      middleware.route.path
    )
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        console.log(
          handler.route.stack[0].method.toUpperCase(),
          handler.route.path
        )
      }
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
