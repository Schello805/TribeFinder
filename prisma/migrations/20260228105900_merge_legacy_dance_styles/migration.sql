-- Defensive merge of legacy dance style records into canonicals.
-- This migration is idempotent and safe to run on prod even if some names don't exist.

DO $$
DECLARE
  canonical_name text;
  legacy_name text;
  canonical_id text;
  legacy_id text;
BEGIN
  -- Helper procedure via repeated blocks.

  -- 1) Global Caravan (formerly Gypsy Caravan)
  canonical_name := 'Global Caravan';
  INSERT INTO "DanceStyle" ("id", "name", "category")
  VALUES (md5(random()::text || clock_timestamp()::text || canonical_name), canonical_name, 'Tribal')
  ON CONFLICT ("name") DO NOTHING;

  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = canonical_name LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    legacy_name := 'Gypsy Caravan';
    SELECT id INTO legacy_id FROM "DanceStyle" WHERE name = legacy_name LIMIT 1;
    IF legacy_id IS NOT NULL AND legacy_id <> canonical_id THEN
      DELETE FROM "GroupDanceStyle" WHERE "styleId" = legacy_id AND "groupId" IN (SELECT "groupId" FROM "GroupDanceStyle" WHERE "styleId" = canonical_id);
      DELETE FROM "UserDanceStyle" WHERE "styleId" = legacy_id AND "userId" IN (SELECT "userId" FROM "UserDanceStyle" WHERE "styleId" = canonical_id);

      UPDATE "GroupDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
      UPDATE "UserDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
      UPDATE "DanceStyleSuggestion" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
      UPDATE "DanceStyleSuggestion" SET "approvedStyleId" = canonical_id WHERE "approvedStyleId" = legacy_id;

      DELETE FROM "DanceStyle" WHERE id = legacy_id;
    END IF;

    INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
      (md5(random()::text || clock_timestamp()::text || 'Gypsy Caravan'), 'Gypsy Caravan', canonical_id, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
  END IF;

  -- 2) ITS (Improvisational Team Synchronization) and legacy variants
  canonical_name := 'ITS (Improvisational Team Synchronization)';
  INSERT INTO "DanceStyle" ("id", "name", "category")
  VALUES (md5(random()::text || clock_timestamp()::text || canonical_name), canonical_name, 'Tribal')
  ON CONFLICT ("name") DO NOTHING;

  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = canonical_name LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    FOREACH legacy_name IN ARRAY ARRAY['Improvisational Tribal Style (ITS)', 'Improvisational Tribal Style', 'ITS']
    LOOP
      SELECT id INTO legacy_id FROM "DanceStyle" WHERE name = legacy_name LIMIT 1;
      IF legacy_id IS NOT NULL AND legacy_id <> canonical_id THEN
        DELETE FROM "GroupDanceStyle" WHERE "styleId" = legacy_id AND "groupId" IN (SELECT "groupId" FROM "GroupDanceStyle" WHERE "styleId" = canonical_id);
        DELETE FROM "UserDanceStyle" WHERE "styleId" = legacy_id AND "userId" IN (SELECT "userId" FROM "UserDanceStyle" WHERE "styleId" = canonical_id);

        UPDATE "GroupDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "UserDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "DanceStyleSuggestion" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "DanceStyleSuggestion" SET "approvedStyleId" = canonical_id WHERE "approvedStyleId" = legacy_id;

        DELETE FROM "DanceStyle" WHERE id = legacy_id;
      END IF;

      INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
        (md5(random()::text || clock_timestamp()::text || legacy_name), legacy_name, canonical_id, now(), now())
      ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
    END LOOP;
  END IF;

  -- 3) BlackSheep BellyDance and legacy variants
  canonical_name := 'BlackSheep BellyDance';
  INSERT INTO "DanceStyle" ("id", "name", "category")
  VALUES (md5(random()::text || clock_timestamp()::text || canonical_name), canonical_name, 'Tribal')
  ON CONFLICT ("name") DO NOTHING;

  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = canonical_name LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    FOREACH legacy_name IN ARRAY ARRAY['BlackSheep', 'BlackSheep Belly Dance', 'BSBD', 'BlackSheep BellyDance Format']
    LOOP
      SELECT id INTO legacy_id FROM "DanceStyle" WHERE name = legacy_name LIMIT 1;
      IF legacy_id IS NOT NULL AND legacy_id <> canonical_id THEN
        DELETE FROM "GroupDanceStyle" WHERE "styleId" = legacy_id AND "groupId" IN (SELECT "groupId" FROM "GroupDanceStyle" WHERE "styleId" = canonical_id);
        DELETE FROM "UserDanceStyle" WHERE "styleId" = legacy_id AND "userId" IN (SELECT "userId" FROM "UserDanceStyle" WHERE "styleId" = canonical_id);

        UPDATE "GroupDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "UserDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "DanceStyleSuggestion" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "DanceStyleSuggestion" SET "approvedStyleId" = canonical_id WHERE "approvedStyleId" = legacy_id;

        DELETE FROM "DanceStyle" WHERE id = legacy_id;
      END IF;

      INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
        (md5(random()::text || clock_timestamp()::text || legacy_name), legacy_name, canonical_id, now(), now())
      ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
    END LOOP;
  END IF;

  -- 4) Salimpour Format and legacy variants
  canonical_name := 'Salimpour Format';
  INSERT INTO "DanceStyle" ("id", "name", "category")
  VALUES (md5(random()::text || clock_timestamp()::text || canonical_name), canonical_name, 'Oriental')
  ON CONFLICT ("name") DO NOTHING;

  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = canonical_name LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    FOREACH legacy_name IN ARRAY ARRAY['Suhaila Salimpour Belly Dance Format', 'Suhaila Salimpour Format']
    LOOP
      SELECT id INTO legacy_id FROM "DanceStyle" WHERE name = legacy_name LIMIT 1;
      IF legacy_id IS NOT NULL AND legacy_id <> canonical_id THEN
        DELETE FROM "GroupDanceStyle" WHERE "styleId" = legacy_id AND "groupId" IN (SELECT "groupId" FROM "GroupDanceStyle" WHERE "styleId" = canonical_id);
        DELETE FROM "UserDanceStyle" WHERE "styleId" = legacy_id AND "userId" IN (SELECT "userId" FROM "UserDanceStyle" WHERE "styleId" = canonical_id);

        UPDATE "GroupDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "UserDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "DanceStyleSuggestion" SET "styleId" = canonical_id WHERE "styleId" = legacy_id;
        UPDATE "DanceStyleSuggestion" SET "approvedStyleId" = canonical_id WHERE "approvedStyleId" = legacy_id;

        DELETE FROM "DanceStyle" WHERE id = legacy_id;
      END IF;

      INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
        (md5(random()::text || clock_timestamp()::text || legacy_name), legacy_name, canonical_id, now(), now())
      ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
    END LOOP;
  END IF;
END $$;