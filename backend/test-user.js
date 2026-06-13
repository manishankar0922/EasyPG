const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@gmail.com' } });
  console.log(user);
}
test();
