-- CreateEnum
CREATE TYPE "DanceMode" AS ENUM ('IMPRO', 'CHOREO');

-- AlterTable
ALTER TABLE "GroupDanceStyle" ADD COLUMN     "mode" "DanceMode";
