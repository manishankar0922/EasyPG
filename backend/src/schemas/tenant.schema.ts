import { z } from 'zod';

const TenantStatusEnum = z.enum(['ACTIVE', 'CHECKED_OUT']);

export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().length(10),
    parentPhone: z.string().min(10).max(20).nullable().optional(),
    aadhaarLast4: z.string().length(4).nullable().optional(),
    photoUrl: z.string().min(1, "Photo is required"),
    aadhaarPhotoUrl: z.string().nullable().optional(),
    collegeName: z.string().max(150).nullable().optional(),
    status: TenantStatusEnum.optional(),
    // Admission & Bed fields
    roomId: z.string().uuid(),
    bedId: z.string().uuid(),
    monthlyRent: z.number().min(0),
    checkinDate: z.string(),
    depositAmount: z.number().min(0).optional(),
  }),
});

export const updateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().min(10).max(20).optional(),
    parentPhone: z.string().min(10).max(20).nullable().optional(),
    aadhaarLast4: z.string().length(4).nullable().optional(),
    photoUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
    aadhaarPhotoUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
    collegeName: z.string().max(150).nullable().optional(),
    status: TenantStatusEnum.optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
