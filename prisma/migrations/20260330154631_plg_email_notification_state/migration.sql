-- AlterTable
ALTER TABLE "AdminAuditLog" ALTER COLUMN "actorAdminId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlgEmailNotificationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlgEmailNotificationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlgEmailNotificationState_notificationType_idx" ON "PlgEmailNotificationState"("notificationType");

-- CreateIndex
CREATE INDEX "PlgEmailNotificationState_targetType_idx" ON "PlgEmailNotificationState"("targetType");

-- CreateIndex
CREATE INDEX "PlgEmailNotificationState_targetId_idx" ON "PlgEmailNotificationState"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "PlgEmailNotificationState_userId_notificationType_targetId__key" ON "PlgEmailNotificationState"("userId", "notificationType", "targetId", "step");

-- AddForeignKey
ALTER TABLE "PlgEmailNotificationState" ADD CONSTRAINT "PlgEmailNotificationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
