-- Announcements (What's new)

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "bullets" JSONB NOT NULL,
  "showFrom" TIMESTAMP(3) NOT NULL,
  "showUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");
CREATE INDEX IF NOT EXISTS "Announcement_showFrom_idx" ON "Announcement"("showFrom");
CREATE INDEX IF NOT EXISTS "Announcement_showUntil_idx" ON "Announcement"("showUntil");
CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx" ON "Announcement"("createdAt");

CREATE TABLE IF NOT EXISTS "AnnouncementDismissal" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnnouncementDismissal_announcementId_fkey'
  ) THEN
    ALTER TABLE "AnnouncementDismissal"
      ADD CONSTRAINT "AnnouncementDismissal_announcementId_fkey"
      FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnnouncementDismissal_userId_fkey'
  ) THEN
    ALTER TABLE "AnnouncementDismissal"
      ADD CONSTRAINT "AnnouncementDismissal_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementDismissal_announcementId_userId_key" ON "AnnouncementDismissal"("announcementId", "userId");
CREATE INDEX IF NOT EXISTS "AnnouncementDismissal_userId_idx" ON "AnnouncementDismissal"("userId");
CREATE INDEX IF NOT EXISTS "AnnouncementDismissal_dismissedAt_idx" ON "AnnouncementDismissal"("dismissedAt");
