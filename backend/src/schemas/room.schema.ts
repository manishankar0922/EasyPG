import { z } from 'zod';

const RoomTypeEnum = z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARE', 'FIVE_SHARE', 'CUSTOM']);
const GenderTypeEnum = z.enum(['BOYS', 'GIRLS', 'UNISEX']);
const RoomStatusEnum = z.enum(['ACTIVE', 'BLOCKED', 'MAINTENANCE']);

export const createRoomSchema = z.object({
  body: z.object({
    branchId: z.string().min(5),
    roomNumber: z.string().min(1).max(20),
    roomType: RoomTypeEnum.optional(),
    totalCapacity: z.number().int().positive(),
    rentAmount: z.number().positive(),
    genderType: GenderTypeEnum.optional(),
    status: RoomStatusEnum.optional(),
  }),
});

export const updateRoomSchema = z.object({
  body: z.object({
    roomNumber: z.string().min(1).max(20).optional(),
    floor: z.number().int().min(0).max(100).optional(),
    hasAC: z.boolean().optional(),
    roomType: RoomTypeEnum.optional(),
    totalCapacity: z.number().int().positive().max(20).optional(),
    rentAmount: z.number().positive().max(500000).optional(),
    genderType: GenderTypeEnum.optional(),
    status: RoomStatusEnum.optional(),
  }),
  params: z.object({
    id: z.string().min(5),
  }),
});
