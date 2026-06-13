import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['query'] });

async function main() {
  console.log('--- CHECK 4: Data Integrity Rules ---');

  // 1. Double Beds
  const doubleBeds = await prisma.admission.groupBy({
    by: ['bedId'],
    where: { status: 'ACTIVE', bedId: { not: null } },
    having: { bedId: { _count: { gt: 1 } } }
  });
  console.log('Double Beds:', doubleBeds.length === 0 ? 'PASS' : `FAIL (${JSON.stringify(doubleBeds)})`);

  // 2. Double Tenants
  const doubleTenants = await prisma.admission.groupBy({
    by: ['tenantId'],
    where: { status: 'ACTIVE' },
    having: { tenantId: { _count: { gt: 1 } } }
  });
  console.log('Double Tenants:', doubleTenants.length === 0 ? 'PASS' : `FAIL (${JSON.stringify(doubleTenants)})`);

  // 3. Cross Org Rooms
  // Actually Prisma doesn't support comparing two columns directly in where across relations easily, so we fetch all rooms and check
  const allRooms = await prisma.room.findMany({ include: { branch: true } });
  const badRooms = allRooms.filter(r => r.organizationId !== r.branch.organizationId);
  console.log('Cross Org Rooms:', badRooms.length === 0 ? 'PASS' : `FAIL (${JSON.stringify(badRooms)})`);

  // 4. Overpaid Ledgers
  const allLedgers = await prisma.rentLedger.findMany();
  const overpaidLedgers = allLedgers.filter(l => l.paidAmount > l.totalDue);
  console.log('Overpaid Ledgers:', overpaidLedgers.length === 0 ? 'PASS' : `FAIL (${JSON.stringify(overpaidLedgers)})`);

  // 5. Orphan Payments
  const orphanPayments = await prisma.payment.findMany({
    where: { ledgerId: null, invoiceId: null }
  });
  console.log('Orphan Payments:', orphanPayments.length === 0 ? 'PASS' : `FAIL (${JSON.stringify(orphanPayments)})`);

  console.log('\n--- CHECK 5: EXPLAIN ANALYZE ---');
  // 1. Tenants for a branch
  const q1 = await prisma.$queryRaw`EXPLAIN ANALYZE SELECT * FROM "tenants" t JOIN "admissions" a ON a."tenant_id" = t.id JOIN "beds" b ON b.id = a."bed_id" JOIN "rooms" r ON r.id = b."room_id" WHERE r."branch_id" = 'test_branch_id' AND a.status = 'ACTIVE'`;
  console.log('Q1 EXPLAIN:', JSON.stringify(q1, null, 2));

  // 2. Pending rent for branch this month
  const q2 = await prisma.$queryRaw`EXPLAIN ANALYZE SELECT * FROM "rent_ledgers" WHERE status IN ('PENDING', 'OVERDUE', 'PARTIAL') AND month = 6 AND year = 2024`;
  console.log('Q2 EXPLAIN:', JSON.stringify(q2, null, 2));

  // 3. Heatmap
  const q3 = await prisma.$queryRaw`EXPLAIN ANALYZE SELECT r.id, r."room_number", r."floor", COUNT(b.id) as totalBeds, COUNT(CASE WHEN b."is_occupied" THEN 1 END) as occupiedBeds FROM "rooms" r JOIN "beds" b ON b."room_id" = r.id WHERE r."branch_id" = 'test_branch_id' GROUP BY r.id, r."room_number", r."floor"`;
  console.log('Q3 EXPLAIN:', JSON.stringify(q3, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
