// scripts/dbHealthCheck.ts
import prisma from '../src/config/db';

async function checkDBHealth() {
  console.log('🔍 Starting DB Health Check...\n');
  const results = [];

  const checks = [
    { name: 'User table', fn: () => prisma.user.count() },
    { name: 'Organisation table', fn: () => prisma.organization.count() },
    { name: 'Branch table', fn: () => prisma.branch.count() },
    { name: 'Room table', fn: () => prisma.room.count() },
    { name: 'Bed table', fn: () => prisma.bed.count() },
    { name: 'Tenant table', fn: () => prisma.tenant.count() },
    { name: 'Admission table', fn: () => prisma.admission.count() },
    { name: 'Payment table', fn: () => prisma.payment.count() },
    { name: 'RentLedger table', fn: () => prisma.rentLedger.count() },
    { name: 'Subscription table', fn: () => prisma.subscription.count() },
  ];

  for (const check of checks) {
    try {
      const count = await check.fn();
      console.log(`✅ ${check.name}: ${count} records`);
      results.push({ name: check.name, status: 'OK', count });
    } catch (error: any) {
      console.log(`❌ ${check.name}: FAILED - ${error.message}`);
      results.push({ name: check.name, status: 'FAIL', error: error.message });
    }
  }

  // Check critical data integrity
  console.log('\n🔍 Checking Data Integrity...\n');

  // Check: beds with no room
  const orphanBeds = await prisma.bed.count({
    where: { roomId: { equals: undefined } }
  });
  console.log(orphanBeds === 0 ? '✅ No orphan beds' : `❌ ${orphanBeds} beds without room`);

  // Check: admissions with no bed
  const orphanAdmissions = await prisma.admission.count({
    where: { bedId: { equals: undefined } }
  });
  console.log(orphanAdmissions === 0 ? '✅ No orphan admissions' : `❌ ${orphanAdmissions} admissions without bed`);

  // Check: double active admissions on same bed
  const doubleBeds = await prisma.$queryRaw`
    SELECT "bed_id", COUNT(*) as count
    FROM "admissions"
    WHERE status = 'ACTIVE'
    GROUP BY "bed_id"
    HAVING COUNT(*) > 1
  `;
  console.log((doubleBeds as any[]).length === 0 ? '✅ No double-assigned beds' : `❌ ${(doubleBeds as any[]).length} beds double-assigned`);

  // Check: users with no role
  const noRoleUsers = await prisma.user.count({
    where: { role: { equals: undefined } }
  });
  console.log(noRoleUsers === 0 ? '✅ All users have roles' : `❌ ${noRoleUsers} users have no role`);

  // Check: organisations with no branches
  const orgsNoBranch = await prisma.organization.findMany({
    where: { branches: { none: {} } },
    select: { id: true, name: true }
  });
  console.log(orgsNoBranch.length === 0 ? '✅ All orgs have branches' : `⚠️ ${orgsNoBranch.length} orgs have no branches: ${orgsNoBranch.map(o => o.name).join(', ')}`);

  // Final report
  const failed = results.filter(r => r.status === 'FAIL');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Passed: ${results.length - failed.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed checks:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    console.log('\nFix: run npx prisma migrate dev');
  } else {
    console.log('\n🎉 Database is healthy!');
  }

  await prisma.$disconnect();
}

checkDBHealth().catch(console.error);
