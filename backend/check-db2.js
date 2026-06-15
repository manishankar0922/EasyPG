const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ledgers = await prisma.rentLedger.findMany();
  console.log('LEDGERS:', ledgers.map(l => ({
      id: l.id,
      month: l.month,
      year: l.year,
      paidAmount: l.paidAmount.toString(),
      totalDue: l.totalDue.toString(),
      status: l.status
  })));

  const invoices = await prisma.invoice.findMany({ include: { payments: true } });
  console.log('INVOICES:', invoices.map(i => ({
      id: i.id,
      month: i.month,
      amount: i.amount.toString(),
      status: i.status,
      payments: i.payments.map(p => p.amount.toString())
  })));
}
check().finally(() => prisma.$disconnect());
