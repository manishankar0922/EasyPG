-- 1. Optimizing: Get all tenants for a branch
CREATE INDEX IF NOT EXISTS "rooms_branch_id_idx" ON "rooms"("branch_id");
CREATE INDEX IF NOT EXISTS "beds_room_id_idx" ON "beds"("room_id");
CREATE INDEX IF NOT EXISTS "admissions_bed_id_status_idx" ON "admissions"("bed_id", "status");

-- 2. Optimizing: Get pending rent for a branch this month
CREATE INDEX IF NOT EXISTS "rent_ledgers_status_month_year_idx" ON "rent_ledgers"("status", "month", "year");

-- 3. Optimizing: Get heatmap data for a branch
CREATE INDEX IF NOT EXISTS "rooms_branch_id_floor_idx" ON "rooms"("branch_id", "floor");
