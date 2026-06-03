import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    ownerName: z.string().min(2).max(100).optional(),
    ownerPhone: z.string().min(10).max(20).optional(),
  }),
});
