import prisma from '../config/db';
import { Queue } from 'bullmq';

export const generateMonthlyRentJob = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Get all active admissions
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: 'ACTIVE' },
    select: {
      tenantId: true,
      monthlyRent: true,
      room: {
        select: {
          rentAmount: true
        }
      }
    }
  });

  const tenantIds = activeAdmissions.map(a => a.tenantId);

  // Bulk fetch existing ledgers for this month
  const existingThisMonth = await prisma.rentLedger.findMany({
    where: {
      month,
      year,
      tenantId: { in: tenantIds }
    },
    select: { tenantId: true }
  });
  const existingTenantIds = new Set(existingThisMonth.map(l => l.tenantId));

  // Get balance from last month
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastYear = month === 1 ? year - 1 : year;

  // Bulk fetch ledgers for last month
  const lastMonthLedgers = await prisma.rentLedger.findMany({
    where: {
      month: lastMonth,
      year: lastYear,
      tenantId: { in: tenantIds }
    },
    select: {
      tenantId: true,
      totalDue: true,
      paidAmount: true
    }
  });

  const lastMonthBalances = new Map(
    lastMonthLedgers.map(l => [l.tenantId, l.totalDue - l.paidAmount])
  );

  const newLedgersData: any[] = [];
  const dueDate = new Date(year, month - 1, 7);

  for (const admission of activeAdmissions) {
    if (existingTenantIds.has(admission.tenantId)) continue; // already generated

    const balance = lastMonthBalances.get(admission.tenantId) || 0;
    const expectedRent = Number(admission.monthlyRent) || Number(admission.room.rentAmount) || 0;

    newLedgersData.push({
      tenantId: admission.tenantId,
      month,
      year,
      expectedRent,
      balanceFromLastMonth: balance > 0 ? balance : 0,
      totalDue: expectedRent + (balance > 0 ? balance : 0),
      status: 'PENDING',
      dueDate
    });
  }

  if (newLedgersData.length > 0) {
    // Insert in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < newLedgersData.length; i += chunkSize) {
      const chunk = newLedgersData.slice(i, i + chunkSize);
      await prisma.rentLedger.createMany({
        data: chunk,
        skipDuplicates: true
      });
    }
  }
};
