ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
UPDATE "User" SET "onboardingCompletedAt" = NOW();

ALTER TABLE "Group" ADD COLUMN "profileVerifiedAt" TIMESTAMP(3);
UPDATE "Group" SET "profileVerifiedAt" = "updatedAt";

CREATE TABLE "EventSeries" (
  "id" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "count" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "Event_seriesId_idx" ON "Event"("seriesId");
ALTER TABLE "Event" ADD CONSTRAINT "Event_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FavoriteEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "remindWeek" BOOLEAN NOT NULL DEFAULT true,
  "remindDay" BOOLEAN NOT NULL DEFAULT true,
  "weekReminderSentAt" TIMESTAMP(3),
  "dayReminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FavoriteEvent_userId_eventId_key" ON "FavoriteEvent"("userId", "eventId");
CREATE INDEX "FavoriteEvent_eventId_idx" ON "FavoriteEvent"("eventId");
ALTER TABLE "FavoriteEvent" ADD CONSTRAINT "FavoriteEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteEvent" ADD CONSTRAINT "FavoriteEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
