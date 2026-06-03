import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding initial data...');

  const ORG_ID = '00000000-0000-0000-0000-000000000001';
  const BRANCH_ID = '00000000-0000-0000-0000-000000000002';
  const PROFILE_ID = '00000000-0000-0000-0000-000000000001';

  // 1. Create a Test Organization
  const organization = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'U9 Test Hostel',
      ownerName: 'Admin Owner',
      ownerPhone: '1234567890',
    },
  });

  console.log(`✅ Organization created: ${organization.name}`);

  // 2. Create a Test Branch
  const branch = await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: {},
    create: {
      id: BRANCH_ID,
      name: 'Main Campus Branch',
      address: '123 Tech Park, South Zone',
      organizationId: organization.id,
    },
  });

  console.log(`✅ Branch created: ${branch.name}`);

  // 3. Create a Test Profile for the developer bypass
  const profile = await prisma.profile.upsert({
    where: { id: PROFILE_ID },
    update: {},
    create: {
      id: PROFILE_ID,
      organizationId: organization.id,
      name: 'Dev Tester',
      role: 'OWNER',
    },
  });

  console.log(`✅ Test Profile created for bypass: ${profile.name}`);

  // 4. Create some Test Rooms
  const room101 = await prisma.room.findFirst({ where: { roomNumber: '101', branchId: BRANCH_ID } });
  if (!room101) {
    await prisma.room.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        roomNumber: '101',
        roomType: 'DOUBLE',
        totalCapacity: 2,
        rentAmount: 5000,
        genderType: 'BOYS',
      },
    });
  }

  const room201 = await prisma.room.findFirst({ where: { roomNumber: '201', branchId: BRANCH_ID } });
  if (!room201) {
    await prisma.room.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        roomNumber: '201',
        roomType: 'SINGLE',
        totalCapacity: 1,
        rentAmount: 8000,
        genderType: 'GIRLS',
      },
    });
  }

  console.log('✅ Test rooms checked/created');

  console.log('\n🚀 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
