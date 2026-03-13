-- Add tripCostId column to Trip (nullable for legacy data)
ALTER TABLE "Trip" ADD COLUMN "tripCostId" TEXT;

-- Add label column to DailyCost
ALTER TABLE "DailyCost" ADD COLUMN "label" TEXT;

-- Rename DailyCost table to TripCost
ALTER TABLE "DailyCost" RENAME TO "TripCost";

-- Link existing trips to their TripCost by carId+date
UPDATE "Trip" t SET "tripCostId" = tc.id
FROM "TripCost" tc
WHERE t."carId" = tc."carId" AND t."date" = tc."date" AND t."tripCostId" IS NULL;

-- Drop type column and enum
ALTER TABLE "Trip" DROP COLUMN "type";
DROP TYPE "TripType";

-- Remove unique index (allow multiple trips per car+date)
DROP INDEX "DailyCost_carId_date_key";

-- Add index on carId+date for TripCost (replacing the unique constraint)
CREATE INDEX "TripCost_carId_date_idx" ON "TripCost"("carId", "date");

-- Add foreign key for tripCostId
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_tripCostId_fkey" FOREIGN KEY ("tripCostId") REFERENCES "TripCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename the existing index/constraint references from DailyCost to TripCost
ALTER INDEX "DailyCost_pkey" RENAME TO "TripCost_pkey";
ALTER TABLE "TripCost" RENAME CONSTRAINT "DailyCost_carId_fkey" TO "TripCost_carId_fkey";
