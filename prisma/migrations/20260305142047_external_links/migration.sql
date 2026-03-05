-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalLink_url_key" ON "ExternalLink"("url");

-- CreateIndex
CREATE INDEX "ExternalLink_status_idx" ON "ExternalLink"("status");

-- CreateIndex
CREATE INDEX "ExternalLink_archivedAt_idx" ON "ExternalLink"("archivedAt");

-- CreateIndex
CREATE INDEX "ExternalLink_submittedById_idx" ON "ExternalLink"("submittedById");

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
