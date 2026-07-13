const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT COUNT(*) AS user_count, SUM("tokenVersion") AS sum_before FROM "User";`;
  console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
