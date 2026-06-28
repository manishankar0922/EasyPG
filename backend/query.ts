import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { email: 'mani@gmail.com' }
  });
  console.log(users);
}
main().finally(() => prisma.$disconnect());
