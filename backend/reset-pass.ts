import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('U9PGs@123', 12);
  const updated = await prisma.user.update({
    where: { email: 'mani@gmail.com' },
    data: { passwordHash: hash }
  });
  console.log('Password reset successfully for:', updated.email);
}

main().finally(() => prisma.$disconnect());
