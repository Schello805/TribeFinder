-- Seed additional dance styles + aliases (pragmatic canonicals).

DO $$
DECLARE
  canonical_id text;
BEGIN
  -- BlackSheep BellyDance
  INSERT INTO "DanceStyle" ("id", "name", "category")
  VALUES (md5(random()::text || clock_timestamp()::text || 'BlackSheep BellyDance'), 'BlackSheep BellyDance', 'Tribal')
  ON CONFLICT ("name") DO NOTHING;

  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'BlackSheep BellyDance' LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
      (md5(random()::text || clock_timestamp()::text || 'BSBD'), 'BSBD', canonical_id, now(), now()),
      (md5(random()::text || clock_timestamp()::text || 'BlackSheep Belly Dance'), 'BlackSheep Belly Dance', canonical_id, now(), now()),
      (md5(random()::text || clock_timestamp()::text || 'BlackSheep BellyDance Format'), 'BlackSheep BellyDance Format', canonical_id, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
  END IF;

  -- Salimpour Format
  INSERT INTO "DanceStyle" ("id", "name", "category")
  VALUES (md5(random()::text || clock_timestamp()::text || 'Salimpour Format'), 'Salimpour Format', 'Oriental')
  ON CONFLICT ("name") DO NOTHING;

  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'Salimpour Format' LIMIT 1;
  IF canonical_id IS NOT NULL THEN
    INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
      (md5(random()::text || clock_timestamp()::text || 'Suhaila Salimpour Belly Dance Format'), 'Suhaila Salimpour Belly Dance Format', canonical_id, now(), now()),
      (md5(random()::text || clock_timestamp()::text || 'Suhaila Salimpour Format'), 'Suhaila Salimpour Format', canonical_id, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
  END IF;
END $$;