const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const user = await prisma.user.findFirst({ where: { email: 'mohan@gmail.com' } });
  if (user) {
    const res = await prisma.payment.updateMany({
      data: { recordedById: user.id }
    });
    console.log(`Updated ${res.count} payments with recordedById = ${user.id}`);
  }
}
fix().finally(() => prisma.$disconnect());
