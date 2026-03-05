-- CreateEnum
CREATE TYPE "ExternalLinkLocationSource" AS ENUM ('PROFILE', 'GEOCODE');

-- CreateEnum
CREATE TYPE "ExternalLinkSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ExternalLink" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "locationSource" "ExternalLinkLocationSource";

-- CreateTable
CREATE TABLE "ExternalLinkSuggestion" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "status" "ExternalLinkSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "decidedByAdminId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalLinkSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalLinkSuggestion_status_idx" ON "ExternalLinkSuggestion"("status");

-- CreateIndex
CREATE INDEX "ExternalLinkSuggestion_linkId_idx" ON "ExternalLinkSuggestion"("linkId");

-- CreateIndex
CREATE INDEX "ExternalLinkSuggestion_createdById_idx" ON "ExternalLinkSuggestion"("createdById");

-- AddForeignKey
ALTER TABLE "ExternalLinkSuggestion" ADD CONSTRAINT "ExternalLinkSuggestion_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ExternalLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLinkSuggestion" ADD CONSTRAINT "ExternalLinkSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLinkSuggestion" ADD CONSTRAINT "ExternalLinkSuggestion_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
