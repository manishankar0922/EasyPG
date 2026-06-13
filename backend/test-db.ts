import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const profiles = await prisma.profile.findMany({ take: 1 });
    console.log("DB connection successful:", profiles);
  } catch (err: any) {
    console.error("DB connection error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
