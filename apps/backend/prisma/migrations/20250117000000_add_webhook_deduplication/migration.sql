-- CreateTable
CREATE TABLE "webhook_deduplication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deduplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deduplication_eventId_key" ON "webhook_deduplication"("eventId");

-- CreateIndex
CREATE INDEX "webhook_deduplication_eventId_idx" ON "webhook_deduplication"("eventId");

-- CreateIndex
CREATE INDEX "webhook_deduplication_expiresAt_idx" ON "webhook_deduplication"("expiresAt");