-- CreateEnum
CREATE TYPE "MarketplaceCategory" AS ENUM ('KOSTUEME', 'SCHMUCK', 'ACCESSOIRES', 'SCHUHE', 'SONSTIGES');

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MarketplaceCategory" NOT NULL,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceListing_category_idx" ON "MarketplaceListing"("category");

-- CreateIndex
CREATE INDEX "MarketplaceListing_expiresAt_idx" ON "MarketplaceListing"("expiresAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_ownerId_idx" ON "MarketplaceListing"("ownerId");

-- CreateIndex
CREATE INDEX "MarketplaceListingImage_listingId_idx" ON "MarketplaceListingImage"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListingImage_listingId_order_key" ON "MarketplaceListingImage"("listingId", "order");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListingImage" ADD CONSTRAINT "MarketplaceListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
