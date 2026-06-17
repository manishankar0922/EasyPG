import { PrismaClient, Plan } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating Subscription plans...');
  
  // Migrate Subscriptions
  await prisma.subscription.updateMany({
    where: { plan: 'STARTER' as any },
    data: { plan: 'BASIC' }
  });
  
  await prisma.subscription.updateMany({
    where: { plan: 'GROWTH' as any },
    data: { plan: 'PRO' }
  });

  // Migrate PaymentRequests
  await prisma.paymentRequest.updateMany({
    where: { plan: 'STARTER' as any },
    data: { plan: 'BASIC' }
  });
  
  await prisma.paymentRequest.updateMany({
    where: { plan: 'GROWTH' as any },
    data: { plan: 'PRO' }
  });

  console.log('Migration complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
