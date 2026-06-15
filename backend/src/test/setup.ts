import prisma from '../config/db';

beforeAll(async () => {
  // Setup logic if any
});

afterAll(async () => {
  // Disconnect prisma client
  await prisma.$disconnect();
});
