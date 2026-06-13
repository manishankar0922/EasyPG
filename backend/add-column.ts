import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;`);
    console.log("Column branch_id added successfully!");
  } catch (err: any) {
    console.error("Error adding column:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
