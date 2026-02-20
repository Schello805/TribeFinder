-- Add accessories text field and extend DanceMode enum with BOTH

ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "accessories" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DanceMode' AND e.enumlabel = 'BOTH'
  ) THEN
    ALTER TYPE "DanceMode" ADD VALUE 'BOTH';
  END IF;
END $$;
