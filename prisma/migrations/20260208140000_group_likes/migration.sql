-- CreateTable
CREATE TABLE "GroupLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupLike_userId_groupId_key" ON "GroupLike"("userId", "groupId");

-- CreateIndex
CREATE INDEX "GroupLike_groupId_idx" ON "GroupLike"("groupId");

-- AddForeignKey
ALTER TABLE "GroupLike" ADD CONSTRAINT "GroupLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLike" ADD CONSTRAINT "GroupLike_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
