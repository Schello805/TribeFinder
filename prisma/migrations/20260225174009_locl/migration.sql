-- CreateEnum
CREATE TYPE "DanceStyleSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DanceStyleSuggestion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formerName" TEXT,
    "websiteUrl" TEXT,
    "description" TEXT,
    "status" "DanceStyleSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "decidedByAdminId" TEXT,
    "approvedStyleId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DanceStyleSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DanceStyleSuggestion_status_idx" ON "DanceStyleSuggestion"("status");

-- CreateIndex
CREATE INDEX "DanceStyleSuggestion_createdById_idx" ON "DanceStyleSuggestion"("createdById");

-- CreateIndex
CREATE INDEX "DanceStyleSuggestion_approvedStyleId_idx" ON "DanceStyleSuggestion"("approvedStyleId");

-- AddForeignKey
ALTER TABLE "DanceStyleSuggestion" ADD CONSTRAINT "DanceStyleSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceStyleSuggestion" ADD CONSTRAINT "DanceStyleSuggestion_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceStyleSuggestion" ADD CONSTRAINT "DanceStyleSuggestion_approvedStyleId_fkey" FOREIGN KEY ("approvedStyleId") REFERENCES "DanceStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
