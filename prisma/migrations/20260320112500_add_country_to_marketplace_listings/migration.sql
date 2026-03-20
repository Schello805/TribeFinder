-- AlterTable
ALTER TABLE "MarketplaceListing" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Deutschland';

-- CreateIndex
CREATE INDEX "MarketplaceListing_country_idx" ON "MarketplaceListing"("country");
