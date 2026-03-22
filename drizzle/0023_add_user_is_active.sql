ALTER TABLE "users" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true;
CREATE INDEX "users_isActive_idx" ON "users" USING btree ("isActive");
