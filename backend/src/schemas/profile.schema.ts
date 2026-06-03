import { z } from 'zod';

const RoleEnum = z.enum(['OWNER', 'WARDEN']);

export const createProfileSchema = z.object({
  body: z.object({
    id: z.string().uuid(), // Supabase User ID
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(20).optional(),
    role: RoleEnum,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(20).optional(),
    role: RoleEnum.optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
