import { z } from 'zod';

const TenantStatusEnum = z.enum(['ACTIVE', 'CHECKED_OUT']);

export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().min(10).max(20),
    parentPhone: z.string().min(10).max(20).optional(),
    aadhaarLast4: z.string().length(4).optional(),
    collegeName: z.string().max(150).optional(),
    status: TenantStatusEnum.optional(),
  }),
});

export const updateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().min(10).max(20).optional(),
    parentPhone: z.string().min(10).max(20).optional(),
    aadhaarLast4: z.string().length(4).optional(),
    collegeName: z.string().max(150).optional(),
    status: TenantStatusEnum.optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
