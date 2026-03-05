-- Allow multiple ExternalLink entries with the same URL for different locations

-- Drop old global unique constraint on URL
DROP INDEX IF EXISTS "ExternalLink_url_key";

-- New composite unique constraint (same URL + same location should not be duplicated)
CREATE UNIQUE INDEX "ExternalLink_url_postalCode_city_key" ON "ExternalLink"("url", "postalCode", "city");

-- Helpful lookup index
CREATE INDEX "ExternalLink_url_idx" ON "ExternalLink"("url");
