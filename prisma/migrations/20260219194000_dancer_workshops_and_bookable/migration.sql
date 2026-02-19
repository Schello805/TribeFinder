-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "dancerGivesWorkshops" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dancerBookableForShows" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dancerWorkshopConditions" TEXT;
