-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateTable
CREATE TABLE "PartyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyGroupMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partyGroupId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "partyGroupId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartyGroupMember_userId_partyGroupId_key" ON "PartyGroupMember"("userId", "partyGroupId");

-- CreateIndex
CREATE INDEX "PartyGroupMember_partyGroupId_idx" ON "PartyGroupMember"("partyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");

-- CreateIndex
CREATE INDEX "InviteToken_token_idx" ON "InviteToken"("token");

-- AddForeignKey
ALTER TABLE "PartyGroupMember" ADD CONSTRAINT "PartyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGroupMember" ADD CONSTRAINT "PartyGroupMember_partyGroupId_fkey" FOREIGN KEY ("partyGroupId") REFERENCES "PartyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_partyGroupId_fkey" FOREIGN KEY ("partyGroupId") REFERENCES "PartyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (DisabledDate)
DROP TABLE IF EXISTS "DisabledDate";

-- DropEnum (old Role)
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "Role";

-- Add partyGroupId to Trip (nullable first for data migration)
ALTER TABLE "Trip" ADD COLUMN "partyGroupId" TEXT;

-- Data migration: create a default PartyGroup and assign all existing data
DO $$
DECLARE
    default_group_id TEXT := 'default_party_group';
BEGIN
    -- Create default group
    INSERT INTO "PartyGroup" ("id", "name", "createdAt", "updatedAt")
    VALUES (default_group_id, 'Default Group', NOW(), NOW());

    -- Add all existing users as ACTIVE ADMIN members
    INSERT INTO "PartyGroupMember" ("id", "userId", "partyGroupId", "role", "status", "createdAt")
    SELECT
        'pgm_' || "id",
        "id",
        default_group_id,
        'ADMIN',
        'ACTIVE',
        NOW()
    FROM "User";

    -- Assign all existing trips to the default group
    UPDATE "Trip" SET "partyGroupId" = default_group_id WHERE "partyGroupId" IS NULL;
END $$;

-- Now make partyGroupId NOT NULL
ALTER TABLE "Trip" ALTER COLUMN "partyGroupId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Trip_partyGroupId_idx" ON "Trip"("partyGroupId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_partyGroupId_fkey" FOREIGN KEY ("partyGroupId") REFERENCES "PartyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
