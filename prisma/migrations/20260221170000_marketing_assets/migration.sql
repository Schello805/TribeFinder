-- Marketing assets

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingAssetType') THEN
    CREATE TYPE "MarketingAssetType" AS ENUM ('LOGO', 'HEADER', 'POSTER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MarketingAsset" (
  "id" TEXT NOT NULL,
  "type" "MarketingAssetType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketingAsset_type_idx" ON "MarketingAsset"("type");
CREATE INDEX IF NOT EXISTS "MarketingAsset_createdAt_idx" ON "MarketingAsset"("createdAt");
