-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "lastName" TEXT,
    "dancerName" TEXT,
    "bio" TEXT,
    "danceLevel" TEXT,
    "lookingFor" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "website" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notifyInboxMessages" BOOLEAN NOT NULL DEFAULT false,
    "notifyNewGroups" BOOLEAN NOT NULL DEFAULT false,
    "notifyNewEvents" BOOLEAN NOT NULL DEFAULT false,
    "notifyLat" REAL,
    "notifyLng" REAL,
    "notifyRadius" INTEGER NOT NULL DEFAULT 50,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bio", "createdAt", "danceLevel", "dancerName", "email", "emailNotifications", "emailVerified", "facebookUrl", "firstName", "id", "image", "instagramUrl", "isBlocked", "lastName", "lookingFor", "name", "notifyLat", "notifyLng", "notifyNewEvents", "notifyNewGroups", "notifyRadius", "password", "resetToken", "resetTokenExpiry", "role", "tiktokUrl", "updatedAt", "website", "youtubeUrl") SELECT "bio", "createdAt", "danceLevel", "dancerName", "email", "emailNotifications", "emailVerified", "facebookUrl", "firstName", "id", "image", "instagramUrl", "isBlocked", "lastName", "lookingFor", "name", "notifyLat", "notifyLng", "notifyNewEvents", "notifyNewGroups", "notifyRadius", "password", "resetToken", "resetTokenExpiry", "role", "tiktokUrl", "updatedAt", "website", "youtubeUrl" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
