-- CreateTable
CREATE TABLE "GroupThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupThread_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupThread_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupThreadMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "GroupThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupThreadMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GroupThread_groupId_idx" ON "GroupThread"("groupId");

-- CreateIndex
CREATE INDEX "GroupThread_createdByUserId_idx" ON "GroupThread"("createdByUserId");

-- CreateIndex
CREATE INDEX "GroupThread_lastMessageAt_idx" ON "GroupThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "GroupThreadMessage_threadId_idx" ON "GroupThreadMessage"("threadId");

-- CreateIndex
CREATE INDEX "GroupThreadMessage_authorId_idx" ON "GroupThreadMessage"("authorId");
