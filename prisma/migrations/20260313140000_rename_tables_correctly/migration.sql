-- Rename tables to match their actual purpose:
-- "Trip" table (stores check-ins) -> "CheckIn"
-- "TripCost" table (stores driver-created trips) -> "Trip"

-- Step 1: Drop foreign key from Trip (check-ins) -> TripCost (trips)
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_tripCostId_fkey";

-- Step 2: Rename "Trip" (check-ins) to "CheckIn"
ALTER TABLE "Trip" RENAME TO "CheckIn";

-- Step 3: Rename "TripCost" (driver trips) to "Trip"
ALTER TABLE "TripCost" RENAME TO "Trip";

-- Step 4: Recreate foreign key from CheckIn.tripId -> Trip.id
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Rename indexes and constraints to match new table names

-- CheckIn (was Trip)
ALTER INDEX "Trip_pkey" RENAME TO "CheckIn_pkey";
ALTER INDEX "Trip_userId_carId_date_idx" RENAME TO "CheckIn_userId_carId_date_idx";
ALTER INDEX "Trip_carId_date_idx" RENAME TO "CheckIn_carId_date_idx";
ALTER TABLE "CheckIn" RENAME CONSTRAINT "Trip_userId_fkey" TO "CheckIn_userId_fkey";
ALTER TABLE "CheckIn" RENAME CONSTRAINT "Trip_carId_fkey" TO "CheckIn_carId_fkey";

-- Trip (was TripCost)
ALTER INDEX "TripCost_pkey" RENAME TO "Trip_pkey";
ALTER INDEX "TripCost_carId_date_idx" RENAME TO "Trip_carId_date_idx";
ALTER TABLE "Trip" RENAME CONSTRAINT "TripCost_carId_fkey" TO "Trip_carId_fkey";
