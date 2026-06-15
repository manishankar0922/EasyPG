const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const ledgers = await prisma.rentLedger.findMany({ where: { month: 5, year: 2026 } });
  for (const l of ledgers) {
      await prisma.rentLedger.update({
          where: { id: l.id },
          data: { month: 6 }
      });
      console.log('Fixed ledger:', l.id);
  }

  const invoices = await prisma.invoice.findMany({ where: { month: '2026-05' } });
  for (const i of invoices) {
      await prisma.invoice.update({
          where: { id: i.id },
          data: { month: '2026-06' }
      });
      console.log('Fixed invoice:', i.id);
  }
}
fix().finally(() => prisma.$disconnect());
