-- AlterTable: Add tripId to Payment (nullable first for backfill)
ALTER TABLE "Payment" ADD COLUMN "tripId" TEXT;

-- Backfill: match existing payments to trips by carId + date
UPDATE "Payment" p
SET "tripId" = (
  SELECT t."id"
  FROM "Trip" t
  WHERE t."carId" = p."carId" AND t."date" = p."date"
  ORDER BY t."createdAt" ASC
  LIMIT 1
);

-- Delete orphan payments that couldn't be matched to any trip
DELETE FROM "Payment" WHERE "tripId" IS NULL;

-- Make tripId required
ALTER TABLE "Payment" ALTER COLUMN "tripId" SET NOT NULL;

-- Drop old foreign key and indexes first
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_carId_fkey";
DROP INDEX IF EXISTS "Payment_carId_idx";
DROP INDEX IF EXISTS "Payment_userId_date_idx";

-- Drop old columns
ALTER TABLE "Payment" DROP COLUMN "carId";
ALTER TABLE "Payment" DROP COLUMN "date";

-- Add new indexes
CREATE INDEX "Payment_tripId_idx" ON "Payment"("tripId");
CREATE INDEX "Payment_userId_tripId_idx" ON "Payment"("userId", "tripId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add cascade delete to CheckIn -> Trip relation and index on tripId
ALTER TABLE "CheckIn" DROP CONSTRAINT IF EXISTS "CheckIn_tripId_fkey";
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CheckIn_tripId_idx" ON "CheckIn"("tripId");
