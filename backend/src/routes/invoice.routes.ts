import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createInvoiceSchema, updateInvoiceSchema } from '../schemas/financial.schema';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// List invoices
router.get('/', async (req, res) => {
  const { status, tenantId } = req.query;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      }),
      ...(status && { status: status as any }),
      ...(tenantId && { tenantId: tenantId as string }),
    },
    include: { tenant: true },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: invoices });
});

// GET /invoices/overdue
router.get('/overdue', async (req, res) => {
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { not: 'PAID' },
      dueDate: { lt: new Date() },
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      })
    },
    include: { tenant: true }
  });
  res.json({ success: true, data: overdueInvoices });
});

// Generate individual invoice
router.post('/', validate(createInvoiceSchema), async (req, res) => {
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;
  const { tenantId } = req.body;

  // Verify tenant exists and check branch restriction
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } }
      })
    }
  });

  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found or unauthorized' });
  }

  const invoice = await prisma.invoice.create({
    data: {
      ...req.body,
      organizationId: orgId,
      dueDate: new Date(req.body.dueDate)
    }
  });
  res.status(201).json({ success: true, data: invoice });
});

// Generate monthly invoices for all active admissions
router.post('/generate-monthly', validate(z.object({ 
  body: z.object({ 
    month: z.string(), 
    dueDate: z.string().datetime().or(z.string().date()) 
  }) 
})), async (req, res) => {
  const { month, dueDate } = req.body;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;

  const activeAdmissions = await prisma.admission.findMany({
    where: { 
      organizationId: orgId, 
      status: 'ACTIVE',
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        room: { branchId: userBranchId }
      })
    },
    include: { tenant: true }
  });

  const invoicesData = activeAdmissions.map(admission => ({
    organizationId: orgId,
    tenantId: admission.tenantId,
    month,
    amount: admission.monthlyRent,
    dueDate: new Date(dueDate),
    status: 'UNPAID' as const
  }));

  // CreateMany might not be available on all providers or with all versions, 
  // but Prisma 5.x supports it for Postgres.
  const result = await prisma.invoice.createMany({
    data: invoicesData,
    skipDuplicates: true // In case we run it twice for same month
  });

  res.json({ success: true, message: `${result.count} invoices generated` });
});

// Update invoice
router.patch('/:id', validate(updateInvoiceSchema), async (req, res) => {
  const invoiceId = req.params.id as string;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;

  // Find target invoice to verify branch ownership
  const targetInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      })
    }
  });

  if (!targetInvoice) {
    return res.status(404).json({ success: false, error: 'Invoice not found or unauthorized' });
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ...req.body,
      ...(req.body.dueDate && { dueDate: new Date(req.body.dueDate) })
    }
  });

  res.json({ success: true, message: 'Invoice updated', data: invoice });
});

// Delete invoice
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().min(5) }) })), async (req, res) => {
  const invoiceId = req.params.id as string;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;

  // Find target invoice to verify branch ownership
  const targetInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        tenant: { admissions: { some: { room: { branchId: userBranchId }, status: 'ACTIVE' } } }
      })
    }
  });

  if (!targetInvoice) {
    return res.status(404).json({ success: false, error: 'Invoice not found or unauthorized' });
  }

  // Check for payments attached to this invoice
  const paymentsCount = await prisma.payment.count({
    where: { invoiceId, organizationId: orgId }
  });

  if (paymentsCount > 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot delete an invoice that has payments recorded against it.' 
    });
  }

  await prisma.invoice.delete({
    where: { id: invoiceId }
  });

  res.json({ success: true, message: 'Invoice deleted successfully' });
});

// GET /invoices/tenant/:tenantId/pending - Get pending invoices for a tenant (for payment recording)
router.get('/tenant/:tenantId/pending', validate(z.object({ params: z.object({ tenantId: z.string().min(5) }) })), async (req, res) => {
  const tenantId = req.params.tenantId as string;
  const orgId = req.user!.organizationId;
  const { role, branchId: userBranchId } = req.user!;

  // Verify tenant belongs to org and branch (for warden/staff)
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId: orgId,
      ...(role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId && {
        admissions: {
          some: {
            room: { branchId: userBranchId },
            status: 'ACTIVE'
          }
        }
      })
    }
  });

  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      tenantId,
      status: { not: 'PAID' }
    },
    include: { payments: true },
    orderBy: { dueDate: 'asc' }
  });

  const formattedInvoices = pendingInvoices.map(inv => {
    const paid = (inv as any).payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    return {
      id: inv.id,
      month: inv.month,
      amount: Number(inv.amount),
      paid,
      pending: Number(inv.amount) - paid,
      dueDate: inv.dueDate,
      status: inv.status
    };
  });

  res.json({ success: true, data: formattedInvoices });
});

export default router;
