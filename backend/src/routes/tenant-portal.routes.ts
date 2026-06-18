import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware strictly for Tenants
const requireTenantAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET missing from .env!');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    if (decoded.role !== 'TENANT') {
      return res.status(403).json({ success: false, error: 'Access denied. Tenants only.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

router.use(requireTenantAuth);

// GET /api/v1/tenant-portal/dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const admission = await prisma.admission.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        room: true,
        bed: true
      }
    });

    if (!admission) {
      return res.json({
        success: true,
        data: {
          pendingRent: 0,
          roomDetails: null,
          notices: []
        }
      });
    }

    // Calculate pending rent based on invoices
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, status: 'UNPAID' }
    });

    const pendingRent = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

    // Get PG Notices (System wide or Organization wide)
    const notices = await prisma.notification.findMany({
      where: { organizationId: req.user.organisationId },
      orderBy: { sentAt: 'desc' },
      take: 5
    });

    res.json({
      success: true,
      data: {
        pendingRent,
        roomDetails: {
          roomNumber: admission.room.roomNumber,
          bedNumber: admission.bed?.bedNumber,
          rentAmount: admission.monthlyRent
        },
        notices
      }
    });
  } catch (error) {
    console.error('Tenant Portal Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

export default router;
