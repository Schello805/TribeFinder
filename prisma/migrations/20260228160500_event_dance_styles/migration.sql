-- Add EventDanceStyle join table so events can be tagged with dance styles

CREATE TABLE IF NOT EXISTS "EventDanceStyle" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "styleId" TEXT NOT NULL,
  CONSTRAINT "EventDanceStyle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventDanceStyle_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventDanceStyle_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "DanceStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventDanceStyle_eventId_styleId_key" ON "EventDanceStyle"("eventId", "styleId");
CREATE INDEX IF NOT EXISTS "EventDanceStyle_styleId_idx" ON "EventDanceStyle"("styleId");
CREATE INDEX IF NOT EXISTS "EventDanceStyle_eventId_idx" ON "EventDanceStyle"("eventId");
