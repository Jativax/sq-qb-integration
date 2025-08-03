-- CreateTable
CREATE TABLE "square_orders" (
    "id" TEXT NOT NULL,
    "squareOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "square_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quickbooks_receipts" (
    "id" TEXT NOT NULL,
    "qbReceiptId" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "rawQBData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "squareOrderId" TEXT NOT NULL,

    CONSTRAINT "quickbooks_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptedAt" TIMESTAMP(3) NOT NULL,
    "logs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "square_orders_squareOrderId_key" ON "square_orders"("squareOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "quickbooks_receipts_qbReceiptId_key" ON "quickbooks_receipts"("qbReceiptId");

-- CreateIndex
CREATE UNIQUE INDEX "quickbooks_receipts_squareOrderId_key" ON "quickbooks_receipts"("squareOrderId");

-- AddForeignKey
ALTER TABLE "quickbooks_receipts" ADD CONSTRAINT "quickbooks_receipts_squareOrderId_fkey" FOREIGN KEY ("squareOrderId") REFERENCES "square_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
