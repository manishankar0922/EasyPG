import { z } from 'zod';

export const checkInSchema = z.object({
  body: z.object({
    tenantId: z.string().min(5),
    roomId: z.string().min(5),
    checkinDate: z.string().datetime().or(z.string().date()),
    monthlyRent: z.number().positive(),
    depositAmount: z.number().nonnegative().optional(),
  }),
});

export const checkOutSchema = z.object({
  body: z.object({
    checkoutDate: z.string().datetime().or(z.string().date()),
  }),
  params: z.object({
    id: z.string().min(5),
  }),
});

export const roomTransferSchema = z.object({
  body: z.object({
    newRoomId: z.string().min(5),
    transferDate: z.string().datetime().or(z.string().date()),
  }),
  params: z.object({
    id: z.string().min(5),
  }),
});
