-- Seed a few additional well-known aliases where we have strong sources.

DO $$
DECLARE
  canonical_id text;
BEGIN
  -- Global Caravan (formerly Gypsy Caravan)
  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'Global Caravan' LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
      (md5(random()::text || clock_timestamp()::text || 'Gypsy Caravan'), 'Gypsy Caravan', canonical_id, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
  END IF;

  -- ITS (Improvisational Team Synchronization) (formerly Improvisational Tribal Style)
  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'ITS (Improvisational Team Synchronization)' LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
      (md5(random()::text || clock_timestamp()::text || 'Improvisational Tribal Style'), 'Improvisational Tribal Style', canonical_id, now(), now()),
      (md5(random()::text || clock_timestamp()::text || 'ITS'), 'ITS', canonical_id, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
  END IF;
END $$;