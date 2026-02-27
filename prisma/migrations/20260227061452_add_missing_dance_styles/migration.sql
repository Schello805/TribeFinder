-- One-time insert of missing DanceStyle rows (canonical names from provided table).
-- Avoid overwriting existing values: use ON CONFLICT DO NOTHING + COALESCE updates.
-- Note: DanceStyle.id is a String(cuid) generated in the app layer, so for raw SQL we generate a random id.

INSERT INTO "DanceStyle" ("id", "name", "category", "formerName", "websiteUrl", "description", "videoUrl")
VALUES
  (md5(random()::text || clock_timestamp()::text), 'ATS Partnering', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'American Tribal Style', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Dark Fusion', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'FCBDStyle', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'FCBDStyle Partnering', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Fan Veils', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Gothic Tribal Fusion', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Libanesischer Stil', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Neo-Tribal', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Post-Tribal', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Schleiertanz (Veil)', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Schwerttanz', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Tribal Improvisation', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Tribal Pop-Fusion', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Urban Tribal', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Zills / Fingerzimbeln', NULL, NULL, NULL, NULL, NULL),
  (md5(random()::text || clock_timestamp()::text), 'Ägyptischer Stil', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT ("name") DO NOTHING;

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Spezielle Interaktionsformen und Formationen für Duos innerhalb des ATS-Systems. Hier liegt der Fokus auf der direkten Kommunikation zwischen zwei Tanzenden.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribefinder.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=i6ZnY8YON9E')
WHERE "name" = 'ATS Partnering';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die ursprüngliche Bezeichnung für den von Carolena Nericcio entwickelten Improvisationsstil. Er gilt als die Wurzel der weltweiten Tribal-Tanzbewegung.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fcbd.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=310z3W0jEy4')
WHERE "name" = 'American Tribal Style';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine düstere, oft mystische Variante der Tribal Fusion mit einer melancholischen oder gotischen Ästhetik. Die Bewegungen sind oft extrem langsam und kontrolliert.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribalfusion.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=G6_YmqAGBLM')
WHERE "name" = 'Dark Fusion';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die aktuelle offizielle Bezeichnung für FatChanceBellyDance® Style (ehemals ATS). Es ist eine weltweit standardisierte Sprache aus Tanzschritten und Zeichen.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fcbd.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=i6ZnY8YON9E')
WHERE "name" = 'FCBDStyle';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ergänzende Techniken zum FCBDStyle, die speziell die Interaktion in Kleingruppen oder Paaren vertiefen.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fcbd.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=i6ZnY8YON9E')
WHERE "name" = 'FCBDStyle Partnering';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Tanz mit Fächerschleiern, die durch die Luft bewegt werden und große, farbenfrohe Bilder erzeugen. Er verbindet Fächertechnik mit den fließenden Bewegungen des Schleiertanzes.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://veildance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=X4XQ8iLOZQg')
WHERE "name" = 'Fan Veils';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine Mischung aus der präzisen Isolationstechnik der Tribal Fusion und der Ästhetik der Gothic-Szene. Er wirkt oft mystisch und sehr kontrolliert.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribalfusion.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=fkvztYmY4Kc')
WHERE "name" = 'Gothic Tribal Fusion';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Bekannt für seine Eleganz, große Bühnenpräsenz und oft modernen musikalischen Arrangements. Er integriert oft Elemente aus dem klassischen Ballett oder Jazz.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://lebanese-dance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=EG4JViivyEg')
WHERE "name" = 'Libanesischer Stil';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine moderne Weiterentwicklung des Tribal-Stils, die sich oft weit von den folkloristischen Wurzeln entfernt. Experimentelle Musik und Bewegungen stehen im Fokus.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribefinder.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=vV77mN9e1fA')
WHERE "name" = 'Neo-Tribal';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein avantgardistischer Tanzstil, der aus der Tribal-Bewegung hervorgegangen ist und oft dekonstruierte Bewegungen nutzt.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribefinder.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=vV77mN9e1fA')
WHERE "name" = 'Post-Tribal';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein Tanz, der die fließenden und raumgreifenden Bewegungen eines großen Seidenschleiers nutzt. Der Schleier dient als Rahmen und Partner der Tänzerin.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://veildance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=PURMTzNJnOE')
WHERE "name" = 'Schleiertanz (Veil)';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein beeindruckender Balancetanz, bei dem ein Krummsäbel auf dem Kopf oder der Hüfte balanciert wird. Er erfordert hohe Körperkontrolle und Ruhe.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://sworddance.info'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/shorts/ySiOPmq7RD4')
WHERE "name" = 'Schwerttanz';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Gruppenimprovisation (wie ATS/ITS), bei der die Tanzenden spontan auf Signale einer Anführerin reagieren. Es gibt keine festen Choreografien.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribal-improv.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=cFLGeEVOjtY')
WHERE "name" = 'Tribal Improvisation';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine moderne Mischung aus Tribal Fusion Technik und populärer Musik sowie Urban-Dance-Elementen.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribefinder.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=vV77mN9e1fA')
WHERE "name" = 'Tribal Pop-Fusion';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine Fusion aus Tribal-Elementen und urbanen Tanzstilen wie Popping oder Locking. Er wirkt oft sehr modern und rhythmisch komplex.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribefinder.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=vV77mN9e1fA')
WHERE "name" = 'Urban Tribal';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Kleine Metallbecken, die an den Fingern getragen werden, um den Tanzrhythmus akustisch zu begleiten. Das Spiel der Zills ist ein eigenständiges Instrumentalfach für Tänzerinnen.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://zillsteaching.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=X4XQ8iLOZQg')
WHERE "name" = 'Zills / Fingerzimbeln';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Gilt als das „Herz“ des Bauchtanzes, geprägt durch Weichheit, tiefe Emotionen und präzise Hüftarbeit. Er vermeidet oft allzu große Show-Effekte zugunsten des Ausdrucks.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://egyptian-dance.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=lRDt5ekT6kg')
WHERE "name" = 'Ägyptischer Stil';