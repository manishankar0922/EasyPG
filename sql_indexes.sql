-- 1. Optimizing: Get all tenants for a branch
CREATE INDEX IF NOT EXISTS "rooms_branch_id_idx" ON "rooms"("branch_id");
CREATE INDEX IF NOT EXISTS "beds_room_id_idx" ON "beds"("room_id");
CREATE INDEX IF NOT EXISTS "admissions_bed_id_status_idx" ON "admissions"("bed_id", "status");

-- 2. Optimizing: Get pending rent for a branch this month
CREATE INDEX IF NOT EXISTS "rent_ledgers_status_month_year_idx" ON "rent_ledgers"("status", "month", "year");

-- 3. Optimizing: Get heatmap data for a branch
CREATE INDEX IF NOT EXISTS "rooms_branch_id_floor_idx" ON "rooms"("branch_id", "floor");

-- 4. Critical: Tenant login query — findFirst({ where: { phone } }) is a full
--    table scan without this. Prisma schema has @@index([phone]) but this file
--    was missing it. Run this against Supabase if not already applied via migration.
CREATE INDEX IF NOT EXISTS "tenants_phone_idx" ON "tenants"("phone");
