-- CreateTable
CREATE TABLE "DanceStyleAlias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DanceStyleAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DanceStyleAlias_name_key" ON "DanceStyleAlias"("name");

-- CreateIndex
CREATE INDEX "DanceStyleAlias_styleId_idx" ON "DanceStyleAlias"("styleId");

-- AddForeignKey
ALTER TABLE "DanceStyleAlias" ADD CONSTRAINT "DanceStyleAlias_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "DanceStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
