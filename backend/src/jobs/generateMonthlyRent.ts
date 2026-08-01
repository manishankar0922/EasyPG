/**
 * generateMonthlyRent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated Monthly Rent Ledger Generation Engine
 *
 * Triggered by BullMQ on the 1st of every month at 00:00 (midnight).
 *
 * Algorithm:
 *   1. Fetch all ACTIVE admissions (with tenant + room + organization context).
 *   2. Bulk-load existing ledgers for this month (idempotency guard).
 *   3. Bulk-load last month's ledgers to carry forward outstanding balances.
 *   4. Build new RentLedger records (skipping tenants already generated).
 *   5. Insert in chunks of 1000 (avoids Postgres max-packet limits at scale).
 *   6. Enqueue WhatsApp rent-due notifications for each new ledger.
 *   7. Write a SystemLog audit entry summarising the run.
 *
 * Design Decisions:
 *   - Uses bulk queries (not per-tenant loops) to scale to 10,000+ tenants.
 *   - `skipDuplicates: true` + `@@unique([tenantId, month, year])` ensures
 *     absolute idempotency — re-running the job never double-bills a tenant.
 *   - Per-tenant errors are caught individually so one failure doesn't abort
 *     the entire batch (fail-safe design).
 *   - WhatsApp notifications are enqueued, not sent inline, to keep the job
 *     fast and avoid WhatsApp API timeouts blocking rent generation.
 *   - Carry-forward balance is clamped to 0 for tenants with credit balances
 *     (overpayments are not auto-applied across months).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import prisma from '../config/db';
import logger from '../lib/logger';

// ── Types ────────────────────────────────────────────────────────────────────

interface JobSummary {
  month: number;
  year: number;
  totalActive: number;
  alreadyGenerated: number;
  newlyCreated: number;
  errors: number;
  durationMs: number;
}

// ── Main Job Function ─────────────────────────────────────────────────────────

export const generateMonthlyRentJob = async (): Promise<JobSummary> => {
  const startedAt = Date.now();
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const year = now.getFullYear();
  const dueDate = new Date(year, month - 1, 7); // Due on the 7th

  logger.info('[RentJob] Starting monthly rent generation', { month, year });

  // ── Step 1: Fetch all ACTIVE admissions ───────────────────────────────────
  //
  // We select only the fields we need (no SELECT * to avoid large payloads).
  // We include the organization to allow per-org grouping in notifications.
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: 'ACTIVE' },
    select: {
      tenantId: true,
      monthlyRent: true,
      tenant: {
        select: {
          organizationId: true,
          name: true,
          phone: true,
        },
      },
      room: {
        select: {
          rentAmount: true,
        },
      },
    },
  });

  const tenantIds = activeAdmissions.map((a) => a.tenantId);
  const totalActive = tenantIds.length;

  logger.info(`[RentJob] Found ${totalActive} active admissions`);

  if (totalActive === 0) {
    logger.info('[RentJob] No active admissions found. Exiting early.');
    return { month, year, totalActive: 0, alreadyGenerated: 0, newlyCreated: 0, errors: 0, durationMs: Date.now() - startedAt };
  }

  // ── Step 2: Idempotency Guard — bulk-fetch already-generated ledgers ───────
  //
  // The @@unique([tenantId, month, year]) constraint on RentLedger guarantees
  // that even if we skip this check, createMany({ skipDuplicates: true }) will
  // never double-bill. This pre-check simply avoids unnecessary insert attempts.
  const existingThisMonth = await prisma.rentLedger.findMany({
    where: { month, year, tenantId: { in: tenantIds } },
    select: { tenantId: true },
  });
  const existingSet = new Set(existingThisMonth.map((l) => l.tenantId));
  const alreadyGenerated = existingSet.size;

  logger.info(`[RentJob] ${alreadyGenerated} ledgers already exist for ${month}/${year} — skipping those tenants`);

  // ── Step 3: Load last month's balances for carry-forward ──────────────────
  //
  // Carry-forward = totalDue − paidAmount from last month.
  // Clamped to 0 (no negative carry-forward for overpayments).
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastYear = month === 1 ? year - 1 : year;

  const lastMonthLedgers = await prisma.rentLedger.findMany({
    where: {
      month: lastMonth,
      year: lastYear,
      tenantId: { in: tenantIds },
    },
    select: { tenantId: true, totalDue: true, paidAmount: true },
  });

  // Build a Map<tenantId, carryForwardBalance> for O(1) lookup in the loop
  const carryForwardMap = new Map<string, number>(
    lastMonthLedgers.map((l) => [
      l.tenantId,
      Math.max(0, l.totalDue - l.paidAmount), // clamp to ≥ 0
    ])
  );

  // ── Step 4: Build new RentLedger records ──────────────────────────────────
  type RentLedgerCreateData = {
    tenantId: string;
    month: number;
    year: number;
    expectedRent: number;
    balanceFromLastMonth: number;
    totalDue: number;
    paidAmount: number;
    status: 'PENDING';
    dueDate: Date;
  };
  const newLedgers: RentLedgerCreateData[] = [];
  const whatsappQueue: Array<{ phone: string; tenantName: string; totalDue: number; orgId: string }> = [];
  let errors = 0;

  for (const admission of activeAdmissions) {
    try {
      // Skip if already generated this month
      if (existingSet.has(admission.tenantId)) continue;

      const expectedRent = Number(admission.monthlyRent) || Number(admission.room.rentAmount) || 0;

      if (expectedRent <= 0) {
        logger.warn(`[RentJob] Skipping tenant ${admission.tenantId} — zero rent amount`, {
          tenantId: admission.tenantId,
        });
        continue;
      }

      const carryForward = carryForwardMap.get(admission.tenantId) ?? 0;
      const totalDue = expectedRent + carryForward;

      newLedgers.push({
        tenantId: admission.tenantId,
        month,
        year,
        expectedRent,
        balanceFromLastMonth: carryForward,
        totalDue,
        paidAmount: 0,
        status: 'PENDING',
        dueDate,
      });

      // Queue WhatsApp notification payload (sent after DB write succeeds)
      if (admission.tenant.phone) {
        whatsappQueue.push({
          phone: admission.tenant.phone,
          tenantName: admission.tenant.name,
          totalDue,
          orgId: admission.tenant.organizationId,
        });
      }
    } catch (err: any) {
      errors++;
      logger.error(`[RentJob] Error building ledger for tenant ${admission.tenantId}`, {
        tenantId: admission.tenantId,
        error: err.message,
      });
    }
  }

  // ── Step 5: Bulk Insert in chunks of 1000 ─────────────────────────────────
  //
  // Chunking avoids hitting Postgres max-packet size limits when processing
  // thousands of tenants simultaneously.
  const CHUNK_SIZE = 1000;
  let newlyCreated = 0;

  for (let i = 0; i < newLedgers.length; i += CHUNK_SIZE) {
    const chunk = newLedgers.slice(i, i + CHUNK_SIZE);
    try {
      const result = await prisma.rentLedger.createMany({
        data: chunk,
        skipDuplicates: true, // Final safety net against race conditions
      });
      newlyCreated += result.count;
      logger.info(`[RentJob] Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${result.count} ledgers`);
    } catch (err: any) {
      errors++;
      logger.error(`[RentJob] Failed to insert chunk starting at index ${i}`, { error: err.message });
    }
  }

  // ── Step 6: Log WhatsApp notification payloads ────────────────────────────
  //
  // In production, this is where you'd enqueue messages into a WhatsApp queue.
  // Currently logs the intent. Replace with actual queue.add() or API call.
  for (const notification of whatsappQueue.slice(0, newlyCreated)) {
    const maskedPhone = notification.phone.replace(/\d(?=\d{4})/g, 'X');
    logger.info(`[RentJob] [WhatsApp] Rent due ₹${notification.totalDue} for ${notification.tenantName} → ${maskedPhone}`);
    // TODO: await whatsappQueue.add('send-rent-due', notification);
  }

  // ── Step 7: Write SystemLog audit entry ───────────────────────────────────
  const durationMs = Date.now() - startedAt;
  const summary: JobSummary = {
    month,
    year,
    totalActive,
    alreadyGenerated,
    newlyCreated,
    errors,
    durationMs,
  };

  try {
    await prisma.systemLog.create({
      data: {
        action: 'MONTHLY_RENT_GENERATION',
        details: JSON.stringify(summary),
      },
    });
  } catch (logErr: any) {
    // Never crash the job due to a logging failure
    logger.error('[RentJob] Failed to write SystemLog', { error: logErr.message });
  }

  logger.info('[RentJob] Completed monthly rent generation', summary);

  return summary;
};
