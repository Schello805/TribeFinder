-- CreateEnum
CREATE TYPE "DanceStyleAliasSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DanceStyleAliasSuggestion" (
    "id" TEXT NOT NULL,
    "aliasName" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "comment" TEXT,
    "status" "DanceStyleAliasSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "decidedByAdminId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DanceStyleAliasSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DanceStyleAliasSuggestion_status_idx" ON "DanceStyleAliasSuggestion"("status");

-- CreateIndex
CREATE INDEX "DanceStyleAliasSuggestion_createdById_idx" ON "DanceStyleAliasSuggestion"("createdById");

-- CreateIndex
CREATE INDEX "DanceStyleAliasSuggestion_styleId_idx" ON "DanceStyleAliasSuggestion"("styleId");

-- CreateIndex
CREATE INDEX "DanceStyleAliasSuggestion_decidedByAdminId_idx" ON "DanceStyleAliasSuggestion"("decidedByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "DanceStyleAliasSuggestion_aliasName_styleId_key" ON "DanceStyleAliasSuggestion"("aliasName", "styleId");

-- AddForeignKey
ALTER TABLE "DanceStyleAliasSuggestion" ADD CONSTRAINT "DanceStyleAliasSuggestion_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "DanceStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceStyleAliasSuggestion" ADD CONSTRAINT "DanceStyleAliasSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanceStyleAliasSuggestion" ADD CONSTRAINT "DanceStyleAliasSuggestion_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
