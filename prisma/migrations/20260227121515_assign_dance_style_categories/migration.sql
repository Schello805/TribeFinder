-- One-time category assignment for DanceStyle.

UPDATE "DanceStyle"
SET "category" = CASE "name"
  WHEN 'Orientalischer Tanz' THEN 'Oriental'
  WHEN 'Bauchtanz' THEN 'Oriental'
  WHEN 'Baladi' THEN 'Oriental'
  WHEN 'Raks Sharqi' THEN 'Oriental'
  WHEN 'Saidi' THEN 'Folklore'
  WHEN 'Shaabi' THEN 'Folklore'
  WHEN 'Ägyptischer Stil' THEN 'Oriental'
  WHEN 'Turkish Oriental' THEN 'Oriental'
  WHEN 'Cabaret' THEN 'Oriental'
  WHEN 'Libanesischer Stil' THEN 'Oriental'
  WHEN 'Drum Solo' THEN 'Oriental'
  WHEN 'Modern Oriental' THEN 'Modern'

  WHEN 'Folklore (Orient)' THEN 'Folklore'
  WHEN 'Dabke' THEN 'Folklore'
  WHEN 'Khaliji' THEN 'Folklore'

  WHEN 'ATS / FCBD Style' THEN 'Tribal'
  WHEN 'American Tribal Style' THEN 'Tribal'
  WHEN 'ATS Partnering' THEN 'Tribal'
  WHEN 'FCBDStyle' THEN 'Tribal'
  WHEN 'FCBDStyle Partnering' THEN 'Tribal'
  WHEN 'ITS' THEN 'Tribal'
  WHEN 'Wüstenrosen ATS' THEN 'Tribal'
  WHEN 'Tribal' THEN 'Tribal'
  WHEN 'Tribal Style' THEN 'Tribal'
  WHEN 'Tribal Improvisation' THEN 'Tribal'

  WHEN 'Fusion' THEN 'Fusion'
  WHEN 'Oriental Fusion' THEN 'Fusion'
  WHEN 'Tribal Fusion' THEN 'Fusion'
  WHEN 'Dark Fusion' THEN 'Fusion'
  WHEN 'Gothic Belly Dance' THEN 'Fusion'
  WHEN 'Gothic Tribal Fusion' THEN 'Fusion'
  WHEN 'Neo-Tribal' THEN 'Fusion'
  WHEN 'Post-Tribal' THEN 'Fusion'
  WHEN 'Urban Tribal' THEN 'Fusion'
  WHEN 'Tribal Pop-Fusion' THEN 'Fusion'
  WHEN 'Fantasy' THEN 'Fusion'
  WHEN 'Flamenco Oriental' THEN 'Fusion'

  WHEN 'Bollywood' THEN 'Modern'

  WHEN 'Fan Veils' THEN 'Sonstiges'
  WHEN 'Zills / Fingerzimbeln' THEN 'Sonstiges'
  WHEN 'Schleiertanz (Veil)' THEN 'Sonstiges'
  WHEN 'Schwerttanz' THEN 'Sonstiges'
  ELSE "category"
END
WHERE "name" IN (
  'Ägyptischer Stil',
  'American Tribal Style',
  'ATS / FCBD Style',
  'ATS Partnering',
  'Baladi',
  'Bauchtanz',
  'Bollywood',
  'Cabaret',
  'Dabke',
  'Dark Fusion',
  'Drum Solo',
  'Fan Veils',
  'Fantasy',
  'FCBDStyle',
  'FCBDStyle Partnering',
  'Flamenco Oriental',
  'Folklore (Orient)',
  'Fusion',
  'Gothic Belly Dance',
  'Gothic Tribal Fusion',
  'ITS',
  'Khaliji',
  'Libanesischer Stil',
  'Modern Oriental',
  'Neo-Tribal',
  'Oriental Fusion',
  'Orientalischer Tanz',
  'Post-Tribal',
  'Raks Sharqi',
  'Saidi',
  'Schleiertanz (Veil)',
  'Schwerttanz',
  'Shaabi',
  'Tribal',
  'Tribal Fusion',
  'Tribal Improvisation',
  'Tribal Pop-Fusion',
  'Tribal Style',
  'Turkish Oriental',
  'Urban Tribal',
  'Wüstenrosen ATS',
  'Zills / Fingerzimbeln'
);