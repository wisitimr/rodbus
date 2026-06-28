-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "paidToId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_paidToId_idx" ON "Payment"("paidToId");
