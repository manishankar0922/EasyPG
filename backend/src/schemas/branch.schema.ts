import { z } from 'zod';

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    address: z.string().optional(),
  }),
});

export const updateBranchSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    address: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
