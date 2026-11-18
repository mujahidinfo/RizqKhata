-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RETAIL', 'SERVICE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'WAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "serviceTemplate" TEXT,
ADD COLUMN     "type" "BusinessType" NOT NULL DEFAULT 'RETAIL';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "depositApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "kind" "ProductKind" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN     "warrantyDays" INTEGER;

-- CreateTable
CREATE TABLE "ServiceJob" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "device" TEXT NOT NULL DEFAULT '',
    "details" JSONB NOT NULL DEFAULT '{}',
    "problem" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RECEIVED',
    "estimate" DOUBLE PRECISION,
    "advance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceMethod" "PaymentMethod",
    "promisedAt" TIMESTAMP(3),
    "warrantyDays" INTEGER,
    "orderId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJobLine" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceJobLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJobEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus",
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_jobNumber_key" ON "ServiceJob"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_orderId_key" ON "ServiceJob"("orderId");

-- CreateIndex
CREATE INDEX "ServiceJob_shopId_status_idx" ON "ServiceJob"("shopId", "status");

-- CreateIndex
CREATE INDEX "ServiceJob_businessId_customerId_idx" ON "ServiceJob"("businessId", "customerId");

-- CreateIndex
CREATE INDEX "ServiceJobLine_jobId_idx" ON "ServiceJobLine"("jobId");

-- CreateIndex
CREATE INDEX "ServiceJobEvent_jobId_createdAt_idx" ON "ServiceJobEvent"("jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobLine" ADD CONSTRAINT "ServiceJobLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobLine" ADD CONSTRAINT "ServiceJobLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobEvent" ADD CONSTRAINT "ServiceJobEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobEvent" ADD CONSTRAINT "ServiceJobEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
