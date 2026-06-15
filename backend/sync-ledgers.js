const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncLedgers() {
  const invoices = await prisma.invoice.findMany({
    include: { payments: true }
  });

  console.log(`Syncing ${invoices.length} invoices to rent ledgers...`);

  for (const invoice of invoices) {
    const invoiceYear = parseInt(invoice.month.substring(0, 4));
    const invoiceMonth = parseInt(invoice.month.substring(5, 7));
    const totalPaid = invoice.payments.reduce((acc, p) => acc + Number(p.amount), 0);

    const rentLedger = await prisma.rentLedger.findFirst({
      where: {
        tenantId: invoice.tenantId,
        month: invoiceMonth,
        year: invoiceYear
      }
    });

    if (rentLedger) {
      await prisma.rentLedger.update({
        where: { id: rentLedger.id },
        data: {
          totalDue: Number(invoice.amount),
          paidAmount: totalPaid,
          status: invoice.status
        }
      });
    } else {
      await prisma.rentLedger.create({
        data: {
          tenantId: invoice.tenantId,
          month: invoiceMonth,
          year: invoiceYear,
          expectedRent: Number(invoice.amount),
          totalDue: Number(invoice.amount),
          paidAmount: totalPaid,
          dueDate: invoice.dueDate,
          status: invoice.status
        }
      });
    }
  }
  
  console.log('Successfully synced all invoices to rent ledgers!');
}

syncLedgers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
