-- Rename tripCostId column to tripId in Trip table (which maps to CheckIn model)
ALTER TABLE "Trip" RENAME COLUMN "tripCostId" TO "tripId";
