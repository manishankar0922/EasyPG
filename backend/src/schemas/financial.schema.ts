import { z } from 'zod';

const InvoiceStatusEnum = z.enum(['PAID', 'PARTIAL', 'UNPAID']);

export const createInvoiceSchema = z.object({
  body: z.object({
    tenantId: z.string().uuid(),
    month: z.string(), // e.g., "June 2026"
    amount: z.number().positive(),
    dueDate: z.string().datetime().or(z.string().date()),
    status: InvoiceStatusEnum.optional(),
  }),
});

export const updateInvoiceSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    dueDate: z.string().datetime().or(z.string().date()).optional(),
    status: InvoiceStatusEnum.optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const PaymentModeEnum = z.enum(['UPI', 'CASH', 'BANK_TRANSFER']);

export const addPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMode: PaymentModeEnum,
    paymentDate: z.string().datetime().or(z.string().date()),
  }),
});
