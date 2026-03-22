-- Marketing asset categories (dynamic marketing sections)

-- 1) Create category table
CREATE TABLE IF NOT EXISTS "MarketingAssetCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketingAssetCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAssetCategory_slug_key" ON "MarketingAssetCategory"("slug");
CREATE INDEX IF NOT EXISTS "MarketingAssetCategory_order_idx" ON "MarketingAssetCategory"("order");

-- 2) Seed default categories (keep IDs stable)
INSERT INTO "MarketingAssetCategory" ("id", "slug", "title", "subtitle", "order")
VALUES
  ('marketing_cat_logo', 'logo', 'Logo', 'Für Webseiten, Social Media und Flyer', 10),
  ('marketing_cat_header', 'header', 'Header / Banner', 'Für Webseiten, Newsletter oder Social Posts', 20),
  ('marketing_cat_poster', 'poster', 'Plakate', 'Zum Download und Weiterverteilen', 30)
ON CONFLICT ("slug") DO NOTHING;

-- 3) Add categoryId to existing assets, backfill from previous enum type
ALTER TABLE "MarketingAsset" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

UPDATE "MarketingAsset" a
SET "categoryId" = c."id"
FROM "MarketingAssetCategory" c
WHERE a."categoryId" IS NULL
  AND (
    (a."type" = 'LOGO' AND c."slug" = 'logo') OR
    (a."type" = 'HEADER' AND c."slug" = 'header') OR
    (a."type" = 'POSTER' AND c."slug" = 'poster')
  );

-- 4) Enforce FK + not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MarketingAsset_categoryId_fkey'
  ) THEN
    ALTER TABLE "MarketingAsset"
      ADD CONSTRAINT "MarketingAsset_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "MarketingAssetCategory"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "MarketingAsset" ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "MarketingAsset_categoryId_idx" ON "MarketingAsset"("categoryId");

-- 5) Drop legacy enum column + type index
DROP INDEX IF EXISTS "MarketingAsset_type_idx";

ALTER TABLE "MarketingAsset" DROP COLUMN IF EXISTS "type";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingAssetType') THEN
    DROP TYPE "MarketingAssetType";
  END IF;
END $$;
