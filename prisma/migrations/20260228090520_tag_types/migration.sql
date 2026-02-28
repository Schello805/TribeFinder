-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('GENERAL', 'DIALECT', 'PROP');

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "type" "TagType" NOT NULL DEFAULT 'GENERAL';
