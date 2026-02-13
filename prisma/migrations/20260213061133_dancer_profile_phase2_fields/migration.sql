-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dancerEducation" TEXT,
ADD COLUMN     "dancerPerformances" TEXT,
ADD COLUMN     "dancerTeaches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dancerTeachingFocus" TEXT,
ADD COLUMN     "dancerTeachingWhere" TEXT;
