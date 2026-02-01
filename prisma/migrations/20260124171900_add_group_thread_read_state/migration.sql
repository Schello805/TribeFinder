-- CreateTable
CREATE TABLE "GroupThreadReadState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupThreadReadState_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "GroupThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupThreadReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GroupThreadReadState_userId_idx" ON "GroupThreadReadState"("userId");

-- CreateIndex
CREATE INDEX "GroupThreadReadState_threadId_idx" ON "GroupThreadReadState"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupThreadReadState_threadId_userId_key" ON "GroupThreadReadState"("threadId", "userId");
