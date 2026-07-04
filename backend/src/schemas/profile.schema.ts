import { z } from 'zod';

// Matches the Prisma Role enum (minus SUPERADMIN, which is never self-served).
// STAFF was removed — it never existed in the DB enum; WARDEN is the staff role.
const RoleEnum = z.enum(['OWNER', 'WARDEN']);
const StatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

export const createProfileSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).optional(),
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(20).optional(),
    role: RoleEnum,
    branchId: z.string().min(5).optional(),
    status: StatusEnum.optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(20).optional(),
    role: RoleEnum.optional(),
    branchId: z.string().min(5).nullish(),
    status: StatusEnum.optional(),
  }),
  params: z.object({
    id: z.string().min(5),
  }),
});
