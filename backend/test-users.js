const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, organisationId: true }
  });
  console.log(users);
  
  if (users.length > 0) {
      const owner = users.find(u => u.role === 'OWNER');
      if (owner) {
          try {
              const branches = await prisma.branch.findMany({
                where: { organizationId: owner.organisationId },
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
}
check().finally(() => prisma.$disconnect());
