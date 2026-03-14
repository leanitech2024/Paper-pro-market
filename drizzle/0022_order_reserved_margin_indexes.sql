-- Migration: 0022_order_reserved_margin_indexes
-- Adds reservedMargin to orders and composite indexes for execution batching.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "reservedMargin" numeric(12, 2) NOT NULL DEFAULT 0
  CHECK ("reservedMargin" >= 0);

CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx"
  ON "orders"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "orders_status_instrumentToken_idx"
  ON "orders"("status", "instrumentToken");
