import prisma from '../config/db';
import { Queue } from 'bullmq';

export const generateMonthlyRentJob = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Get all active admissions
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: 'ACTIVE' },
    include: {
      tenant: true,
      room: true
    }
  });

  for (const admission of activeAdmissions) {
    // Check if ledger entry already exists for this month
    const existing = await prisma.rentLedger.findUnique({
      where: {
        tenantId_month_year: {
          tenantId: admission.tenantId,
          month,
          year
        }
      }
    });

    if (existing) continue; // already generated

    // Get balance from last month
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastYear = month === 1 ? year - 1 : year;

    const lastLedger = await prisma.rentLedger.findUnique({
      where: {
        tenantId_month_year: {
          tenantId: admission.tenantId,
          month: lastMonth,
          year: lastYear
        }
      }
    });

    const balance = lastLedger
      ? lastLedger.totalDue - lastLedger.paidAmount
      : 0;

    const expectedRent = Number(admission.monthlyRent) || Number(admission.room.rentAmount) || 0;

    // Create this month's ledger entry
    await prisma.rentLedger.create({
      data: {
        tenantId: admission.tenantId,
        month,
        year,
        expectedRent,
        balanceFromLastMonth: balance > 0 ? balance : 0,
        totalDue: expectedRent + (balance > 0 ? balance : 0),
        status: 'PENDING',
        dueDate: new Date(year, month - 1, 7) // due by 7th
      }
    });
  }
};
