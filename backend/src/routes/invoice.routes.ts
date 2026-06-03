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

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
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
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { not: 'PAID' },
      dueDate: { lt: new Date() }
    },
    include: { tenant: true }
  });
  res.json({ success: true, data: overdueInvoices });
});

// Generate individual invoice
router.post('/', validate(createInvoiceSchema), async (req, res) => {
  const invoice = await prisma.invoice.create({
    data: {
      ...req.body,
      organizationId: req.user!.organizationId,
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

  const activeAdmissions = await prisma.admission.findMany({
    where: { organizationId: orgId, status: 'ACTIVE' },
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
  const invoice = await prisma.invoice.updateMany({
    where: { id: invoiceId, organizationId: req.user!.organizationId },
    data: {
      ...req.body,
      ...(req.body.dueDate && { dueDate: new Date(req.body.dueDate) })
    }
  });

  if (invoice.count === 0) return res.status(404).json({ success: false, error: 'Invoice not found' });
  res.json({ success: true, message: 'Invoice updated' });
});

// Delete invoice
router.delete('/:id', validate(z.object({ params: z.object({ id: z.string().uuid() }) })), async (req, res) => {
  const invoiceId = req.params.id as string;
  const result = await prisma.invoice.deleteMany({
    where: { id: invoiceId, organizationId: req.user!.organizationId }
  });

  if (result.count === 0) return res.status(404).json({ success: false, error: 'Invoice not found' });
  res.json({ success: true, message: 'Invoice deleted successfully' });
});

export default router;
