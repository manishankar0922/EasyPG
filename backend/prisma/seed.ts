import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Clean Development Seed...');

  // 1. Core Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Skyline Premium Hostels',
      ownerName: 'Vikram Sethi',
      ownerPhone: '98765 11111',
    }
  });

  // 2. Base Developer Owner Profile (linked to mock-dev-token / dev@gmail.com)
  const ownerProfile = await prisma.profile.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001', // Fixed for dev bypass
      organizationId: org.id,
      name: 'Vikram Sethi',
      email: 'dev@gmail.com',
      phone: '98765 11111',
      role: 'OWNER'
    }
  });

  // 3. Base Developer Super Admin Profile (linked to mock-admin-token / admin@gmail.com)
  const adminProfile = await prisma.profile.create({
    data: {
      id: '00000000-0000-0000-0000-000000000000', // Fixed for admin bypass
      name: 'System Admin',
      email: 'admin@gmail.com',
      phone: '98765 00000',
      role: 'SUPER_ADMIN'
    }
  });

  console.log('✅ Base Organization, Developer Owner, and Super Admin Profiles Created.');
  console.log(`
🌱 CLEAN SEED SUMMARY:
----------------------
Organization: ${org.name}
Developer Owner: Vikram Sethi (id: 00000000-0000-0000-0000-000000000001)
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
