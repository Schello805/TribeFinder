-- RedefineTables
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "website" TEXT,
    "contactEmail" TEXT,
    "image" TEXT,
    "headerImage" TEXT,
    "headerImageFocusY" INTEGER,
    "headerGradientFrom" TEXT,
    "headerGradientTo" TEXT,
    "videoUrl" TEXT,
    "size" TEXT NOT NULL DEFAULT 'SMALL',
    "trainingTime" TEXT,
    "performances" BOOLEAN NOT NULL DEFAULT false,
    "foundingYear" INTEGER,
    "seekingMembers" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Group" (
  "contactEmail",
  "createdAt",
  "description",
  "headerGradientFrom",
  "headerGradientTo",
  "headerImage",
  "id",
  "image",
  "name",
  "ownerId",
  "performances",
  "foundingYear",
  "seekingMembers",
  "size",
  "trainingTime",
  "updatedAt",
  "videoUrl",
  "website"
)
SELECT
  "contactEmail",
  "createdAt",
  "description",
  "headerGradientFrom",
  "headerGradientTo",
  "headerImage",
  "id",
  "image",
  "name",
  "ownerId",
  "performances",
  "foundingYear",
  "seekingMembers",
  "size",
  "trainingTime",
  "updatedAt",
  "videoUrl",
  "website"
FROM "Group";

DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
