-- This migration is intentionally defensive.
-- Some restored databases may be missing newer columns while _prisma_migrations
-- already marks earlier migrations as applied.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isDancerProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isDancerProfilePrivate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dancerTeaches" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dancerTeachingWhere" TEXT,
  ADD COLUMN IF NOT EXISTS "dancerTeachingFocus" TEXT,
  ADD COLUMN IF NOT EXISTS "dancerEducation" TEXT,
  ADD COLUMN IF NOT EXISTS "dancerPerformances" TEXT;
