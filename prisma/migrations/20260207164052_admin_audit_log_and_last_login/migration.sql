-- CreateEnum
CREATE TYPE "MarketplaceListingType" AS ENUM ('OFFER', 'REQUEST');

-- CreateEnum
CREATE TYPE "MarketplacePriceType" AS ENUM ('FIXED', 'NEGOTIABLE');

-- CreateEnum
CREATE TYPE "MarketplaceLocationSource" AS ENUM ('PROFILE', 'GEOCODE');

-- AlterTable
ALTER TABLE "MarketplaceListing" ADD COLUMN     "city" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "listingType" "MarketplaceListingType" NOT NULL DEFAULT 'OFFER',
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "locationSource" "MarketplaceLocationSource",
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "priceType" "MarketplacePriceType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "shippingAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shippingCostCents" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "notifyDirectMessages" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DirectMessageEmailNotificationState" (
    "id" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "lastNotifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessageEmailNotificationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorAdminId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetBackupFilename" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectMessageEmailNotificationState_receiverId_idx" ON "DirectMessageEmailNotificationState"("receiverId");

-- CreateIndex
CREATE INDEX "DirectMessageEmailNotificationState_senderId_idx" ON "DirectMessageEmailNotificationState"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageEmailNotificationState_receiverId_senderId_key" ON "DirectMessageEmailNotificationState"("receiverId", "senderId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorAdminId_idx" ON "AdminAuditLog"("actorAdminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_postalCode_idx" ON "MarketplaceListing"("postalCode");

-- CreateIndex
CREATE INDEX "MarketplaceListing_city_idx" ON "MarketplaceListing"("city");

-- CreateIndex
CREATE INDEX "MarketplaceListing_lat_idx" ON "MarketplaceListing"("lat");

-- CreateIndex
CREATE INDEX "MarketplaceListing_lng_idx" ON "MarketplaceListing"("lng");

-- AddForeignKey
ALTER TABLE "DirectMessageEmailNotificationState" ADD CONSTRAINT "DirectMessageEmailNotificationState_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageEmailNotificationState" ADD CONSTRAINT "DirectMessageEmailNotificationState_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
