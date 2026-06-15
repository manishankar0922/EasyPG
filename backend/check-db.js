const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ledgers = await prisma.rentLedger.findMany({
    include: { tenant: true }
  });
  console.dir(ledgers, { depth: null });

  const invoices = await prisma.invoice.findMany({
    include: { payments: true }
  });
  console.dir(invoices, { depth: null });
}
check().finally(() => prisma.$disconnect());
