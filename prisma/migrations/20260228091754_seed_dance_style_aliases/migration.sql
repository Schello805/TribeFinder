-- One-time: canonicalize FCBD Style naming and seed aliases.

DO $$
DECLARE
  canonical_id TEXT;
  dup_id TEXT;
BEGIN
  -- Find or create canonical style "FCBD Style".
  SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'FCBD Style' LIMIT 1;

  IF canonical_id IS NULL THEN
    -- Prefer renaming an existing style to keep relations stable.
    SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'ATS / FCBD Style' LIMIT 1;
    IF canonical_id IS NOT NULL THEN
      UPDATE "DanceStyle" SET name = 'FCBD Style' WHERE id = canonical_id;
    END IF;
  END IF;

  IF canonical_id IS NULL THEN
    SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'ATS (FCBDStyle)' LIMIT 1;
    IF canonical_id IS NOT NULL THEN
      UPDATE "DanceStyle" SET name = 'FCBD Style' WHERE id = canonical_id;
    END IF;
  END IF;

  IF canonical_id IS NULL THEN
    SELECT id INTO canonical_id FROM "DanceStyle" WHERE name = 'FCBDStyle' LIMIT 1;
    IF canonical_id IS NOT NULL THEN
      UPDATE "DanceStyle" SET name = 'FCBD Style' WHERE id = canonical_id;
    END IF;
  END IF;

  IF canonical_id IS NULL THEN
    INSERT INTO "DanceStyle" (id, name)
    VALUES (md5(random()::text || clock_timestamp()::text), 'FCBD Style')
    RETURNING id INTO canonical_id;
  END IF;

  -- Merge duplicates into canonical style (only known synonyms).
  FOREACH dup_id IN ARRAY ARRAY[
    (SELECT id FROM "DanceStyle" WHERE name = 'ATS / FCBD Style' AND id <> canonical_id LIMIT 1),
    (SELECT id FROM "DanceStyle" WHERE name = 'ATS (FCBDStyle)' AND id <> canonical_id LIMIT 1),
    (SELECT id FROM "DanceStyle" WHERE name = 'American Tribal Style' AND id <> canonical_id LIMIT 1),
    (SELECT id FROM "DanceStyle" WHERE name = 'American Tribal Style (ATS)' AND id <> canonical_id LIMIT 1),
    (SELECT id FROM "DanceStyle" WHERE name = 'ATS' AND id <> canonical_id LIMIT 1),
    (SELECT id FROM "DanceStyle" WHERE name = 'FCBDStyle' AND id <> canonical_id LIMIT 1)
  ]
  LOOP
    IF dup_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Avoid unique conflicts (groupId+styleId / userId+styleId) by removing duplicates first.
    DELETE FROM "GroupDanceStyle" g
    WHERE g."styleId" = dup_id
      AND EXISTS (
        SELECT 1
        FROM "GroupDanceStyle" g2
        WHERE g2."groupId" = g."groupId" AND g2."styleId" = canonical_id
      );

    UPDATE "GroupDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = dup_id;

    DELETE FROM "UserDanceStyle" u
    WHERE u."styleId" = dup_id
      AND EXISTS (
        SELECT 1
        FROM "UserDanceStyle" u2
        WHERE u2."userId" = u."userId" AND u2."styleId" = canonical_id
      );

    UPDATE "UserDanceStyle" SET "styleId" = canonical_id WHERE "styleId" = dup_id;

    -- Suggestions that targeted a deleted style should now target the canonical style.
    UPDATE "DanceStyleSuggestion" SET "styleId" = canonical_id WHERE "styleId" = dup_id;
    UPDATE "DanceStyleSuggestion" SET "approvedStyleId" = canonical_id WHERE "approvedStyleId" = dup_id;

    DELETE FROM "DanceStyle" WHERE id = dup_id;
  END LOOP;

  -- Seed aliases (searchable/selectable synonyms -> canonical style).
  INSERT INTO "DanceStyleAlias" ("id", "name", "styleId", "createdAt", "updatedAt") VALUES
    (md5(random()::text || clock_timestamp()::text || 'ATS'), 'ATS', canonical_id, now(), now()),
    (md5(random()::text || clock_timestamp()::text || 'American Tribal Style'), 'American Tribal Style', canonical_id, now(), now()),
    (md5(random()::text || clock_timestamp()::text || 'American Tribal Style (ATS)'), 'American Tribal Style (ATS)', canonical_id, now(), now()),
    (md5(random()::text || clock_timestamp()::text || 'ATS / FCBD Style'), 'ATS / FCBD Style', canonical_id, now(), now()),
    (md5(random()::text || clock_timestamp()::text || 'ATS (FCBDStyle)'), 'ATS (FCBDStyle)', canonical_id, now(), now()),
    (md5(random()::text || clock_timestamp()::text || 'FCBDStyle'), 'FCBDStyle', canonical_id, now(), now())
  ON CONFLICT ("name") DO UPDATE SET "styleId" = EXCLUDED."styleId", "updatedAt" = now();
END $$;