import { Worker } from 'bullmq';
import { redisConnection } from './index';
import prisma from '../config/db';

// On Vercel (serverless), Workers cannot run — no persistent Redis connection.
const isVercel = !!process.env.VERCEL;

export const orgSetupWorker = isVercel
  ? ({ on: () => {} } as any)
  : new Worker(
  'org-setup-queue',
  async (job) => {
    if (job.name === 'process-org-setup') {
      const { organizationId, branches } = job.data;
      console.log(`Processing org setup for orgId: ${organizationId}...`);

      try {
        await prisma.$transaction(async (tx) => {
          await Promise.all(
            branches.map(async (branch: any) => {
              const newBranch = await tx.branch.create({
                data: {
                  name: branch.name,
                  address: branch.address,
                  floors: branch.floors.length,
                  organizationId
                }
              });

              for (const floor of branch.floors) {
                for (let i = 1; i <= floor.roomCount; i++) {
                  const roomNumber = `${floor.floorNumber}-${i.toString().padStart(2, '0')}`;
                  const newRoom = await tx.room.create({
                    data: {
                      roomNumber,
                      floor: floor.floorNumber,
                      totalCapacity: floor.bedsPerRoom,
                      rentAmount: 0,
                      organizationId,
                      branchId: newBranch.id
                    }
                  });

                  const bedData = Array.from({ length: floor.bedsPerRoom }).map((_, idx) => ({
                    bedNumber: `${roomNumber}-${String.fromCharCode(65 + idx)}`,
                    roomId: newRoom.id,
                    organizationId
                  }));
                  await tx.bed.createMany({ data: bedData });
                }
              }
            })
          );
        });
        console.log(`Org setup for orgId: ${organizationId} completed.`);
      } catch (error) {
        console.error(`Org setup for orgId: ${organizationId} failed:`, error);
        throw error; // Let BullMQ handle retry
      }
    }
  },
  { connection: redisConnection as any }
);

if (!isVercel) {
  orgSetupWorker.on('failed', (job: any, err: any) => {
    console.error(`Job ${job?.id} in orgSetupQueue failed with error:`, err.message);
  });

  orgSetupWorker.on('error', (err: any) => {
    // Catch worker level connection errors
  });
}

