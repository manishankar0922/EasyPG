import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('🔄 Connecting to database and running check...');
  
  // 1. Get first organisation
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ Error: No organization found in the database. Run seed first.');
    process.exit(1);
  }
  console.log(`✅ Found organization: "${org.name}" (ID: ${org.id})`);

  // 2. Create test tenant
  const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
  const testName = 'Verification Test Tenant';
  
  console.log(`🔄 Creating test tenant: "${testName}" with phone: "${testPhone}"...`);
  
  const newTenant = await prisma.tenant.create({
    data: {
      organizationId: org.id,
      name: testName,
      phone: testPhone,
      status: 'ACTIVE'
    }
  });
  
  console.log(`✅ Tenant created in DB successfully! Generated ID: ${newTenant.id}`);

  // 3. Retrieve tenant to confirm write persistence
  console.log(`🔄 Verifying persistence of Tenant ID: ${newTenant.id}...`);
  const fetchedTenant = await prisma.tenant.findUnique({
    where: { id: newTenant.id }
  });
  
  if (fetchedTenant && fetchedTenant.name === testName && fetchedTenant.phone === testPhone) {
    console.log('✅ DATABASE PERSISTENCE CHECK: SUCCESS! Data is correctly stored and retrievable.');
  } else {
    console.error('❌ DATABASE PERSISTENCE CHECK: FAILED! Retrived data does not match.');
  }

  // 4. Clean up test tenant
  console.log(`🔄 Cleaning up test tenant ID: ${newTenant.id}...`);
  await prisma.tenant.delete({
    where: { id: newTenant.id }
  });
  console.log('✅ Cleanup finished.');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
