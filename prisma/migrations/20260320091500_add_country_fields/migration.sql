-- Add country fields for worldwide support

-- Events
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'Deutschland';

-- Group locations
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'Deutschland';

-- External links
ALTER TABLE "ExternalLink" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- External link suggestions
ALTER TABLE "ExternalLinkSuggestion" ADD COLUMN IF NOT EXISTS "country" TEXT;
