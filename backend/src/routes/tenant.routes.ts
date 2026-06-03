import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createTenantSchema, updateTenantSchema } from '../schemas/tenant.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// List tenants with search and filter
router.get('/', async (req, res) => {
  const { search, status } = req.query;
  const orgId = req.user!.organizationId;

  const tenants = await prisma.tenant.findMany({
    where: {
      organizationId: orgId,
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
        ]
      })
    },
    include: {
      admissions: {
        where: { status: 'ACTIVE' },
        include: { room: { include: { branch: true } } }
      }
    }
  });

  res.json({ success: true, data: tenants });
});

// Alias for search
router.get('/search', async (req, res) => {
  const { q } = req.query;
  const orgId = req.user!.organizationId;

  const tenants = await prisma.tenant.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: q as string, mode: 'insensitive' } },
        { phone: { contains: q as string } },
      ]
    }
  });
  res.json({ success: true, data: tenants });
});

// Get single tenant profile and history
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId: req.user!.organizationId },
    include: {
      admissions: {
        include: { room: { include: { branch: true } } },
        orderBy: { createdAt: 'desc' }
      },
      invoices: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, data: tenant });
});

// GET /tenants/:id/history
router.get('/:id/history', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const history = await prisma.admission.findMany({
    where: { tenantId, organizationId: req.user!.organizationId },
    include: { room: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: history });
});

// Create tenant
router.post('/', validate(createTenantSchema), async (req, res) => {
  const tenant = await prisma.tenant.create({
    data: {
      ...req.body,
      organizationId: req.user!.organizationId,
      status: req.body.status || 'ACTIVE'
    }
  });

  res.status(201).json({ success: true, data: tenant });
});

// Update tenant
router.patch('/:id', validate(updateTenantSchema), async (req, res) => {
  const tenantId = req.params.id as string;
  const tenant = await prisma.tenant.updateMany({
    where: { id: tenantId, organizationId: req.user!.organizationId },
    data: req.body
  });

  if (tenant.count === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, message: 'Tenant updated' });
});

// Delete tenant
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const tenantId = req.params.id as string;
  const orgId = req.user!.organizationId;

  // Check for active admissions
  const activeAdmissions = await prisma.admission.count({
    where: { tenantId, organizationId: orgId, status: 'ACTIVE' }
  });

  if (activeAdmissions > 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot delete tenant with an active admission. Please checkout first.' 
    });
  }

  const result = await prisma.tenant.deleteMany({
    where: { id: tenantId, organizationId: orgId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

  res.json({ success: true, message: 'Tenant deleted' });
});

export default router;
