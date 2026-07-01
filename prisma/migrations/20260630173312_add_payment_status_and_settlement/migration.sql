-- CreateEnum
CREATE TYPE "ComandaPaymentStatus" AS ENUM ('PAID', 'RECEIVABLE');

-- AlterTable
ALTER TABLE "Comanda" ADD COLUMN     "customerProfileId" UUID,
ADD COLUMN     "paymentStatus" "ComandaPaymentStatus",
ADD COLUMN     "settlementId" UUID;

-- CreateTable
CREATE TABLE "Settlement" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "customerProfileId" UUID NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "comandasCount" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledBy" UUID NOT NULL,
    "invoiceIssued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Settlement_clubId_idx" ON "Settlement"("clubId");

-- CreateIndex
CREATE INDEX "Settlement_clubId_customerProfileId_idx" ON "Settlement"("clubId", "customerProfileId");

-- CreateIndex
CREATE INDEX "Comanda_clubId_paymentStatus_idx" ON "Comanda"("clubId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Comanda_customerProfileId_idx" ON "Comanda"("customerProfileId");

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: CLOSED comandas with Payment → PAID
UPDATE "Comanda" c SET "paymentStatus" = 'PAID'
WHERE c.status = 'CLOSED' AND EXISTS (SELECT 1 FROM "Payment" p WHERE p."comandaId" = c.id);

-- Backfill: CLOSED comandas without Payment → RECEIVABLE
UPDATE "Comanda" c SET "paymentStatus" = 'RECEIVABLE'
WHERE c.status = 'CLOSED' AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."comandaId" = c.id);
