import { PrismaClient, Role, RoomType, GenderType, TenantStatus, AdmissionStatus, InvoiceStatus, PaymentMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Comprehensive Seed...');

  // 1. Core Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Skyline Premium Hostels',
      ownerName: 'Vikram Sethi',
      ownerPhone: '98765 11111',
    }
  });

  // 2. Users (Hierarchy)
  // Owner (Already created via Org potentially, but we need Profile)
  const ownerProfile = await prisma.profile.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001', // Fixed for dev bypass
      organizationId: org.id,
      name: 'Vikram Sethi',
      phone: '98765 11111',
      role: 'OWNER'
    }
  });

  const warden1 = await prisma.profile.create({
    data: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: org.id,
      name: 'Anita Sharma',
      phone: '98765 22222',
      role: 'WARDEN'
    }
  });

  const staff1 = await prisma.profile.create({
    data: {
      id: '00000000-0000-0000-0000-000000000003',
      organizationId: org.id,
      name: 'Ramesh Kumar',
      phone: '98765 33333',
      role: 'STAFF'
    }
  });

  console.log('✅ Users Created: Owner, Warden, Staff');

  // 3. Branches
  const branchA = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: 'North Wing',
      address: 'Near City College'
    }
  });

  const branchB = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: 'South Wing',
      address: 'Main Market Area'
    }
  });

  console.log('✅ Branches Created: North & South');

  // 4. Rooms (Using 5-digit Room Numbers)
  const rooms = [];
  // North Wing Rooms
  rooms.push(await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      roomNumber: '10001',
      roomType: 'SINGLE',
      totalCapacity: 1,
      rentAmount: 12000,
      genderType: 'BOYS'
    }
  }));

  rooms.push(await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      roomNumber: '10002',
      roomType: 'DOUBLE',
      totalCapacity: 2,
      rentAmount: 7500,
      genderType: 'BOYS'
    }
  }));

  // South Wing Rooms
  rooms.push(await prisma.room.create({
    data: {
      organizationId: org.id,
      branchId: branchB.id,
      roomNumber: '20001',
      roomType: 'DOUBLE',
      totalCapacity: 2,
      rentAmount: 8000,
      genderType: 'GIRLS'
    }
  }));

  console.log('✅ Rooms Created with 5-digit numbers');

  // 5. Tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      organizationId: org.id,
      name: 'Arjun Reddy',
      phone: '90000 00001',
      aadhaarLast4: '1234',
      collegeName: 'IIT Madras',
      status: 'ACTIVE'
    }
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      organizationId: org.id,
      name: 'Priya Das',
      phone: '90000 00002',
      aadhaarLast4: '5678',
      collegeName: 'NIFT',
      status: 'ACTIVE'
    }
  });

  console.log('✅ Tenants Created');

  // 6. Admissions
  const adm1 = await prisma.admission.create({
    data: {
      organizationId: org.id,
      tenantId: tenant1.id,
      roomId: rooms[0].id, // Room 10001
      checkinDate: new Date('2026-01-01'),
      monthlyRent: 12000,
      depositAmount: 12000,
      status: 'ACTIVE'
    }
  });

  // Update room occupancy
  await prisma.room.update({
    where: { id: rooms[0].id },
    data: { occupiedCapacity: 1 }
  });

  console.log('✅ Admissions Processed');

  // 7. Invoices & Payments
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      tenantId: tenant1.id,
      month: 'June 2026',
      amount: 12000,
      dueDate: new Date('2026-06-05'),
      status: 'PAID'
    }
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      invoiceId: invoice.id,
      amount: 12000,
      paymentMode: 'UPI',
      paymentDate: new Date()
    }
  });

  console.log('✅ Financial Data Seeded');

  console.log(`
🌱 SEEDING SUMMARY:
-------------------
Organization: ${org.name}
Users: Vikram (Owner), Anita (Warden), Ramesh (Staff)
Branches: 2
Rooms: 3 (IDs: 10001, 10002, 20001)
Tenants: Arjun, Priya
Active Admissions: 1
Financials: 1 PAID Invoice

Use the 'dev-bypass' token to login as Vikram Sethi.
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
