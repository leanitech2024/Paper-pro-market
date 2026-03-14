CREATE TYPE "public"."child_order_type" AS ENUM('STOP_LOSS', 'TARGET');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('CNC', 'MIS');--> statement-breakpoint
CREATE TABLE "ledger_account_balances" (
	"accountId" uuid PRIMARY KEY NOT NULL,
	"balance" numeric(28, 8) DEFAULT '0' NOT NULL,
	"lastSequence" bigint DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "ledger_entries_idempotencyKey_unique";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "balanceBefore" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "balanceAfter" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "blockedBefore" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "blockedAfter" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "balance" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "balance" SET DEFAULT '1000000.00';--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "equity" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "equity" SET DEFAULT '1000000.00';--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "blockedBalance" SET DATA TYPE numeric(28, 8);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "blockedBalance" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "productType" text DEFAULT 'CNC' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "leverage" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reservedMargin" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stopLossPrice" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "targetPrice" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "childOrderType" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "parentOrderId" uuid;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "productType" text DEFAULT 'CNC' NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "leverage" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_account_balances" ADD CONSTRAINT "ledger_account_balances_accountId_ledger_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."ledger_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_account_balances_accountId_idx" ON "ledger_account_balances" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "orders_status_createdAt_idx" ON "orders" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "orders_status_token_idx" ON "orders" USING btree ("status","instrumentToken");--> statement-breakpoint
CREATE INDEX "orders_parentOrderId_idx" ON "orders" USING btree ("parentOrderId");--> statement-breakpoint
CREATE INDEX "idx_positions_userId" ON "positions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_reference_idempotency_unique" ON "ledger_entries" USING btree ("referenceType","referenceId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "ledger_entries_debit_sequence_idx" ON "ledger_entries" USING btree ("debitAccountId","globalSequence");--> statement-breakpoint
CREATE INDEX "ledger_entries_credit_sequence_idx" ON "ledger_entries" USING btree ("creditAccountId","globalSequence");--> statement-breakpoint
CREATE INDEX "ledger_entries_reference_created_idx" ON "ledger_entries" USING btree ("referenceType","createdAt");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_leverage_range" CHECK ("orders"."leverage" >= 1 AND "orders"."leverage" <= 10);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_reservedMargin_non_negative" CHECK ("orders"."reservedMargin" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_stopLossPrice_positive" CHECK ("orders"."stopLossPrice" IS NULL OR "orders"."stopLossPrice" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_targetPrice_positive" CHECK ("orders"."targetPrice" IS NULL OR "orders"."targetPrice" > 0);--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_leverage_range" CHECK ("positions"."leverage" >= 1 AND "positions"."leverage" <= 10);