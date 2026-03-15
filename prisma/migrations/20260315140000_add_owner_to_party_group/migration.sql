-- AlterTable: add ownerId to PartyGroup (nullable, since existing groups won't have it)
ALTER TABLE "PartyGroup" ADD COLUMN "ownerId" TEXT;

-- Data migration: set ownerId to the first ADMIN member of each group
UPDATE "PartyGroup" pg
SET "ownerId" = (
    SELECT pgm."userId"
    FROM "PartyGroupMember" pgm
    WHERE pgm."partyGroupId" = pg."id"
      AND pgm."role" = 'ADMIN'
      AND pgm."status" = 'ACTIVE'
    ORDER BY pgm."createdAt" ASC
    LIMIT 1
);

-- AddForeignKey
ALTER TABLE "PartyGroup" ADD CONSTRAINT "PartyGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
