-- One-time data fill for DanceStyle info fields.
-- Uses COALESCE so existing manually maintained values are not overwritten.

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein moderner Gruppentanz, der auf einem System von improvisierten Signalen (Cues) basiert. Er verbindet folkloristische Elemente mit einer stolzen, aufrechten Haltung.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fcbd.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=310z3W0jEy4')
WHERE "name" = 'ATS / FCBD Style';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein erdiger, ägyptischer Volkstanzstil, der oft als „Heimat-Tanz“ bezeichnet wird. Er ist gefühlvoll und weniger distanziert als der klassische Bühnentanz.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://oriental-dance.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=RpGwph82h-M')
WHERE "name" = 'Baladi';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Der allgemeine Oberbegriff für orientalischen Tanz in seinen vielfältigen Ausprägungen. Er umfasst fließende Wellenbewegungen ebenso wie kraftvolle Hüftakzente.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://bauchtanz.info'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=umupZQXN-_k')
WHERE "name" = 'Bauchtanz';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein energiegeladener Mix aus indischen klassischen Tänzen und modernen westlichen Einflüssen. Bekannt geworden ist dieser Stil vor allem durch die indische Filmindustrie.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://bollywood-dance.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=6-Yv_m2f3pI')
WHERE "name" = 'Bollywood';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Bezieht sich oft auf den glamourösen Stil der Nachtclubs, wie er in den 50er Jahren in Libanon oder Ägypten populär war. Er ist geprägt von Glanz, Präsenz und Unterhaltungswert.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://orientaldance.org'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=EG4JViivyEg')
WHERE "name" = 'Cabaret';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein traditioneller Folkloretanz aus der Levante-Region, der meist als Reihen- oder Kreistanz auf Festen getanzt wird. Charakteristisch ist das rhythmische Stampfen auf den Boden.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://dabke.org'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=PUFzxE_FUOc')
WHERE "name" = 'Dabke';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein dynamisches Stück, bei dem die Tänzerin jeden einzelnen Schlag der Trommel (Tabla) isoliert mit dem Körper umsetzt. Es ist das technische Highlight vieler Shows.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://drum-mind.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=KKQDltknU7c')
WHERE "name" = 'Drum Solo';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein freier Stil, der orientalische Elemente mit fantasievollen Kostümen oder Requisiten wie LED-Flügeln kombiniert. Hier steht die erzählerische Inszenierung im Vordergrund.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fantasy-dance.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=DW-Kl8A2zE0')
WHERE "name" = 'Fantasy';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine Fusion aus dem stolzen, rhythmischen Flamenco und der Weichheit des orientalischen Tanzes. Typisch sind Handbewegungen (Floreos) und rhythmische Fußarbeit.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://flamenco-oriental.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=WcozvzjJeik')
WHERE "name" = 'Flamenco Oriental';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Sammelbegriff für die überlieferten Volkstänze verschiedener arabischer Länder. Jeder Tanz erzählt oft Geschichten aus dem ländlichen oder städtischen Alltag.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://folklore-oriental.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=xV2CZiq_lTI')
WHERE "name" = 'Folklore (Orient)';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die bewusste Vermischung von orientalischem Tanz mit modernen westlichen Stilen wie Hip-Hop, Jazz oder Modern Dance. Er erlaubt grenzenlose kreative Freiheit.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fusion-dance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=lRDt5ekT6kg')
WHERE "name" = 'Fusion';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Eine tänzerische Umsetzung der Gothic-Kultur, die oft theatralisch, dunkel und emotional aufgeladen ist. Die Musik stammt meist aus den Bereichen Dark Wave oder Industrial.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://gothic-bellydance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=fkvztYmY4Kc')
WHERE "name" = 'Gothic Belly Dance';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein improvisierter Gruppentanz ähnlich wie ATS, jedoch oft mit einem moderneren oder athletischeren Bewegungskatalog. Jede Gruppe nutzt ein eigenes Vokabular.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://unmata.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=cFLGeEVOjtY')
WHERE "name" = 'ITS';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein „Golf-Tanz“ aus der Region Saudi-Arabien, der durch sanftes Schwingen der Haare und weite Übergewänder geprägt ist. Er wird oft sehr freudig und gemeinschaftlich getanzt.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://khaliji.info'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=KKQDltknU7c')
WHERE "name" = 'Khaliji';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die zeitgenössische Interpretation des orientalischen Tanzes unter Einbeziehung moderner Tanztechniken. Er wirkt oft sehr akademisch und technisch anspruchsvoll.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://modern-oriental.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=GxgJYHVTGLE')
WHERE "name" = 'Modern Oriental';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die Verbindung von orientalischen Grundbewegungen mit beliebigen anderen Kunstformen oder Tanzstilen weltweit.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://fusion-dance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=lRDt5ekT6kg')
WHERE "name" = 'Oriental Fusion';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die korrekte Fachbezeichnung für Bauchtanz, die den kulturellen Kontext und die Vielfalt des Stils besser umfasst.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://bv-orientaltanz.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=umupZQXN-_k')
WHERE "name" = 'Orientalischer Tanz';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Der klassische „Tanz des Ostens“, wie er in den großen Theatern und Filmen Ägyptens etabliert wurde. Er gilt als die höchste Form der orientalischen Tanzkunst.'
  ),
  "formerName" = COALESCE("formerName", 'Raqs Sharqi'),
  "websiteUrl" = COALESCE("websiteUrl", 'https://raqs-sharqi.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=lRDt5ekT6kg')
WHERE "name" = 'Raks Sharqi';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein kraftvoller Folkloretanz aus Oberägypten, der oft mit einem Stock (Assaya) getanzt wird. Er ist durch hüpfende Schritte und Stolz charakterisiert.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://saidi-dance.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=b_GksJpaOy8')
WHERE "name" = 'Saidi';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Der „Tanz des Volkes“, ein frecher und moderner Straßentanz aus den ägyptischen Städten. Er ist direkt, humorvoll und sehr ausdrucksstark.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://shaabi.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=3KzSgLzP4yY')
WHERE "name" = 'Shaabi';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein Oberbegriff für die modernen, in den USA entstandenen „Stammes“-Tänze wie ATS und Tribal Fusion. Er betont Gemeinschaft und Erdverbundenheit.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribal-dance.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=310z3W0jEy4')
WHERE "name" = 'Tribal';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein moderner Ableger von ATS, der meist als fest choreografiertes Solo getanzt wird. Er ist bekannt für extrem präzise Muskelisolationen und Schlangenbewegungen.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribalfusion.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=vV77mN9e1fA')
WHERE "name" = 'Tribal Fusion';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Ein Synonym für die Ästhetik und Technik der Tribal-Tanzfamilie, oft geprägt durch voluminöse Kostüme und Silberschmuck.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://tribal-style.de'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=310z3W0jEy4')
WHERE "name" = 'Tribal Style';

UPDATE "DanceStyle"
SET
  "description" = COALESCE(
    "description",
    'Die türkische Variante des Bauchtanzes, die oft lebhafter und akzentuierter als die ägyptische ist. Typisch sind Bodenarbeit und das Spiel mit Fingerzimbeln.'
  ),
  "websiteUrl" = COALESCE("websiteUrl", 'https://turkish-dance.com'),
  "videoUrl" = COALESCE("videoUrl", 'https://www.youtube.com/watch?v=KKQDltknU7c')
WHERE "name" = 'Turkish Oriental';