CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "route" TEXT,
    "status" INTEGER,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "stack" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEmailSentAt" DATETIME
);

CREATE UNIQUE INDEX "ErrorLog_fingerprint_key" ON "ErrorLog"("fingerprint");

CREATE INDEX "ErrorLog_lastSeenAt_idx" ON "ErrorLog"("lastSeenAt");

CREATE INDEX "ErrorLog_status_idx" ON "ErrorLog"("status");
