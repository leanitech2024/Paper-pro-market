-- Migration: 0021_product_type_sl_target_leverage
-- Adds productType, stopLossPrice, targetPrice, leverage to orders table.
-- Adds productType, leverage to positions table.
-- Adds child_order_type to orders table to distinguish parent vs SL/Target child orders.

-- ── orders ──────────────────────────────────────────────────────────────────

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "productType"      text        NOT NULL DEFAULT 'CNC'
                                              CHECK ("productType" IN ('CNC', 'MIS')),
  ADD COLUMN IF NOT EXISTS "leverage"         integer     NOT NULL DEFAULT 1
                                              CHECK ("leverage" >= 1 AND "leverage" <= 10),
  ADD COLUMN IF NOT EXISTS "stopLossPrice"    numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "targetPrice"      numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "childOrderType"   text
                                              CHECK ("childOrderType" IN ('STOP_LOSS', 'TARGET') OR "childOrderType" IS NULL),
  ADD COLUMN IF NOT EXISTS "parentOrderId"    uuid        REFERENCES "orders"("id") ON DELETE SET NULL;

-- Index: quickly find all child SL/Target orders for a parent
CREATE INDEX IF NOT EXISTS "orders_parentOrderId_idx"
  ON "orders"("parentOrderId")
  WHERE "parentOrderId" IS NOT NULL;

-- Index: find open SL/Target child orders for the monitoring engine
CREATE INDEX IF NOT EXISTS "orders_childOrderType_status_idx"
  ON "orders"("childOrderType", "status")
  WHERE "childOrderType" IS NOT NULL AND "status" = 'OPEN';

-- ── positions ────────────────────────────────────────────────────────────────

ALTER TABLE "positions"
  ADD COLUMN IF NOT EXISTS "productType"  text     NOT NULL DEFAULT 'CNC'
                                          CHECK ("productType" IN ('CNC', 'MIS')),
  ADD COLUMN IF NOT EXISTS "leverage"     integer  NOT NULL DEFAULT 1
                                          CHECK ("leverage" >= 1 AND "leverage" <= 10);
