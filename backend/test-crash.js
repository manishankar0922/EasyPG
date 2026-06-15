const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'mohanmanishankar01@gmail.com' } });
  console.log('User:', user);
  if (user && user.organizationId) {
      try {
          const branches = await prisma.branch.findMany({
            where: { organizationId: user.organizationId },
            include: {
              _count: { select: { rooms: true } },
              rooms: { select: { totalCapacity: true, occupiedCapacity: true } }
            }
          });
          console.log('Branches:', branches);
      } catch (err) {
          console.error('Prisma Error:', err);
      }
  }
}
check();
