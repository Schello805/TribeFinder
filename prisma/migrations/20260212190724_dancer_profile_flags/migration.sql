-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDancerProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDancerProfilePrivate" BOOLEAN NOT NULL DEFAULT false;
