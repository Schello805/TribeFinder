-- AlterTable
ALTER TABLE "DanceStyleSuggestion" ADD COLUMN     "styleId" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- CreateIndex
CREATE INDEX "DanceStyleSuggestion_styleId_idx" ON "DanceStyleSuggestion"("styleId");

-- AddForeignKey
ALTER TABLE "DanceStyleSuggestion" ADD CONSTRAINT "DanceStyleSuggestion_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "DanceStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
