import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });

prisma.$on('query', (e) => {
  // console.log('Query: ' + e.query);
  // console.log('Params: ' + e.params);
  // console.log('Duration: ' + e.duration + 'ms');
});

async function main() {
  // Check organizations
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Test Org', ownerName: 'Owner', ownerPhone: '1234567890' }
    });
  }
  
  let branch = await prisma.branch.findFirst({ where: { organizationId: org.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { name: 'Test Branch', organizationId: org.id }
    });
  }

  // Check tenants count
  const tenantsCount = await prisma.tenant.count({ where: { organizationId: org.id } });
  if (tenantsCount < 50) {
    console.log(`Only ${tenantsCount} tenants found, seeding 50 tenants...`);
    // Seed 50 rooms
    for(let i=1; i<=50; i++) {
      const room = await prisma.room.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          roomNumber: `R-${i}`,
          totalCapacity: 1,
          occupiedCapacity: 1,
          rentAmount: 5000
        }
      });
      const bed = await prisma.bed.create({
        data: {
          organizationId: org.id,
          roomId: room.id,
          bedNumber: 'Bed A',
          isOccupied: true
        }
      });
      const tenant = await prisma.tenant.create({
        data: {
          organizationId: org.id,
          name: `Tenant ${i}`,
          phone: `1000000${i.toString().padStart(2, '0')}`
        }
      });
      await prisma.admission.create({
        data: {
          organizationId: org.id,
          tenantId: tenant.id,
          roomId: room.id,
          bedId: bed.id,
          checkinDate: new Date(),
          monthlyRent: 5000,
          status: 'ACTIVE'
        }
      });
    }
    console.log('Seeding completed.');
  }

  const branchId = branch.id;
  const orgId = org.id;

  console.log('\n--- TEST 1: GET /api/dashboard/mobile-home ---');
  let start = Date.now();
  // Simulate mobile-home logic
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: 'ACTIVE', room: { organizationId: orgId, branchId } },
    include: {
      tenant: {
        include: { rentLedgers: { where: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } } }
      },
      room: true
    }
  });
  console.log(`Time: ${Date.now() - start}ms`);

  console.log('\n--- TEST 2: GET /api/branches/:id/rooms ---');
  start = Date.now();
  const rooms = await prisma.room.findMany({
    where: { organizationId: orgId, branchId: branchId },
    include: { beds: true }
  });
  console.log(`Time: ${Date.now() - start}ms`);

  console.log('\n--- TEST 3: GET /api/tenants?branchId=x ---');
  start = Date.now();
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const activeAdmissionsTenants = await prisma.admission.findMany({
    where: { organizationId: orgId, status: 'ACTIVE', room: { branchId } },
    include: {
      tenant: { include: { invoices: { where: { createdAt: { gte: currentMonthStart } } } } },
      room: true, bed: true,
    },
    orderBy: { checkinDate: 'desc' }
  });
  console.log(`Time: ${Date.now() - start}ms`);

  console.log('\n--- TEST 4: GET /api/branches/:id/heatmap ---');
  start = Date.now();
  const heatmapRooms = await prisma.room.findMany({
    where: { organizationId: orgId, branchId: branchId },
    include: { 
      beds: true, 
      admissions: { 
        where: { status: 'ACTIVE' }, 
        include: { 
          tenant: { include: { vacateNotice: true } },
          bed: true 
        } 
      } 
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
  });
  console.log(`Time: ${Date.now() - start}ms`);

  console.log('\n--- TEST 5: GET /api/tenants/:id/history ---');
  start = Date.now();
  const history = await prisma.admission.findMany({
    where: { tenantId: activeAdmissions[0].tenant.id, organizationId: orgId },
    include: { room: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Time: ${Date.now() - start}ms`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
