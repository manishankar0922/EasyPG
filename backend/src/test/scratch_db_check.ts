import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('🔄 Cleaning up conflicting phone numbers...');
  
  // Update the Test Owner profile phone to free up 9876543210
  const result = await prisma.profile.updateMany({
    where: { phone: '9876543210' },
    data: { phone: '9876543219' }
  });
  
  console.log(`✅ Updated ${result.count} profile(s). Phone 9876543210 is now free!`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
