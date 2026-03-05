-- CreateTable
CREATE TABLE "ExternalLinkCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalLinkCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalLinkCategory_name_key" ON "ExternalLinkCategory"("name");

-- CreateIndex
CREATE INDEX "ExternalLinkCategory_name_idx" ON "ExternalLinkCategory"("name");

-- Seed: fill categories from existing external links (best-effort)
INSERT INTO "ExternalLinkCategory" ("id", "name", "createdAt", "updatedAt")
SELECT DISTINCT
  concat('extlinkcat_', md5(trim("category"))) AS "id",
  trim("category") AS "name",
  CURRENT_TIMESTAMP AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "ExternalLink"
WHERE "category" IS NOT NULL AND trim("category") <> ''
ON CONFLICT ("name") DO NOTHING;
