# Changelog

## [Unreleased] - 2026-03-22

### 📣 Marketing

- Marketing: Asset-Typen sind jetzt dynamische Kategorien (DB-verwaltet) statt fester Enum (Logo/Header/Poster).
- Admin → Marketing: Kategorien können angelegt/gelöscht werden; Uploads werden Kategorien zugeordnet.
- /marketing: Bereiche/Sektionen werden automatisch aus Kategorien gerendert.
- Marketing: Upload unterstützt jetzt auch MP4 (Video) und MP3 (Audio) inkl. Abspielen im Admin und auf /marketing.

### 🧰 Maintenance

- Wartungsseite: Logo wird wieder zuverlässig angezeigt (relativer Pfad + Fallback auf /icons/icon-512.png).

### 🚀 Deploy

- Deploy (native): Schwere Steps (npm install/prisma generate/next build) laufen mit niedrigerer CPU/IO-Priorität; Hinweis wenn kein Swap aktiv ist.

## [Unreleased] - 2026-03-20

### 🌍 Länder

- Events: Land als validiertes Textfeld (weltweite Länder auf Deutsch) mit Autocomplete.
- Events: Land-Feld bleibt editierbar (nicht mehr durch Default „Deutschland“ überschrieben).
- Filter (Events/Gruppen): Standortsuche um Land ergänzt, Geocoding nutzt countrycodes.
- Gruppen: Standort um Land ergänzt (Formular + Wizard + API + Anzeige).
- Links: Standort um Land ergänzt (Submit + Vorschläge + Admin + Geocoding + Map/Anzeige).
- Map: Gruppen-Popup zeigt Land am Standort an.
- DB: Backfill-Script für fehlende Länderwerte (`npm run db:backfill-country`).

### 📍 Standort

- Verbesserte Fehlermeldungen bei Standort-Ermittlung (Safari/macOS): konkrete Hinweise für Berechtigung / nicht verfügbar / Timeout.

### 🔗 Links

- Admin: Tab „Vorschläge“ zeigt jetzt auch neue Link-Einreichungen (PENDING) inkl. Freigeben/Ablehnen.
- Admin: Einreicher bekommen automatisch eine Direktnachricht, wenn ihr Link-Vorschlag (bzw. Änderungsvorschlag) freigegeben oder abgelehnt wurde.

### 🛍️ Second-Hand

- Inserate: Land ergänzt (Formular + API + Anzeige) inkl. Geocoding nach Land.

## [Unreleased] - 2026-03-19

### 🧩 Events

- Events: Adresse um Land ergänzt (Default: Deutschland) inkl. Unterstützung für Nachbarländer.
- Event-Formular: Land-Auswahl + Geocoding/Positionsprüfung berücksichtigen das ausgewählte Land.

## [Unreleased] - 2026-03-15

### 🔐 Admin / Audit-Log

- Audit-Log: Auth-Events ergänzt (Login Erfolg/Fehler inkl. Lockout & Rate-Limits).
- Audit-Log: Passwort-Reset Events ergänzt (angefordert/gesendet/erfolgreich/fehlgeschlagen).
- Audit-Log: E-Mail-Verifikation Events ergänzt (erfolgreich/ungültig/bereits verifiziert).
- Audit-Log: Registrierung Events ergänzt (Erfolg/Rate-Limit/E-Mail existiert/Validierung) inkl. Versandstatus der Verifikationsmail.
- Audit-Log: `actorAdmin` kann für System/Auth-Events leer sein (Schema angepasst).

## [Unreleased] - 2026-03-13

### 🔓 Auth

- Verbesserte Fehlermeldungen beim Login: `/auth/signin` zeigt NextAuth-Fehler (z.B. `CredentialsSignin`, `EMAIL_NOT_VERIFIED`, `LOGIN_LOCKED`) zuverlässig als Toast und Inline-Hinweis an und behandelt unerwartete/undefined SignIn-Responses.
- Login: Feedback-Link für ausgeloggte Nutzer auf `/auth/signin` (vorbefüllt für Login-Probleme) inkl. Rate-Limit + Honeypot-Spamschutz im Feedback-Endpoint.

### 🏠 Startseite

- Hero: Zeigt das normale Logo als Platzhalter im rechten Logo/Video-Bereich, bis das Asset geladen ist.
- Hero: Rechter Hintergrund nutzt jetzt die gleiche Farbe wie die Navbar (`--nav-bg`) statt reinem Schwarz.
- Hero: Hintergrund-Füllflächen hinter dem Logo/Video entfernt (rechteckig + rund), damit transparente Assets sauber mit dem Panel-Hintergrund verschmelzen.

### 🧭 Navigation

- Konto-Menü: Schließt sich beim Klick außerhalb/ESC und beim Ausführen von Menü-Aktionen (z.B. Theme wechseln).
- Mobile-Menü: Schließt sich beim Tippen außerhalb (und per ESC).

## [Unreleased] - 2026-03-08

### 🍪 Datenschutz

- Consent: Hydration-Fix – Cookie-Banner wird erst nach Mount gerendert (keine SSR/Client-Mismatch bei vorhandenem LocalStorage-Consent)

### 🧭 Navigation

- Navbar: Nachrichten-Link zeigt auf `/messages` (Desktop-Menü + Mobile-Menü)
- Navbar: Ungelesene Nachrichten werden als Badge im Konto-Bereich angezeigt

### 📱 Mobile

- PWA: Install-Promo zeigt auf Mobile auch ohne Install-Prompt eine manuelle Anleitung (Android/iOS), z.B. wenn PWA im Dev deaktiviert ist; im Konto-Menü ist die Install-Anleitung zusätzlich auch am Desktop erreichbar
- PWA: Fix – "App installieren" im Konto-Menü öffnet jetzt zuverlässig den Dialog (Menü schließt erst nach einer Aktion)
- PWA: Install-Promo nutzt echte Android/iOS Icons statt Platzhalter-Emojis
- PWA: Install-Promo zeigt App-Logo (Branding/Fallback) und wirkt optisch stärker (dezente Animation)
- PWA: Install-Promo Layout: mehr Abstand zwischen Text und Buttons
- Release: Version auf 2.8.1 erhöht

### 🔎 SEO

- SEO: Canonical URLs + robustere Meta-Descriptions für Event-/Gruppen-Detailseiten; Map/Hilfe mit Description+Canonical; private Bereiche (auth/dashboard/messages/direct-messages/admin) per noindex ausgeschlossen; robots.txt + sitemap erweitert

### ✨ UI

- Startseite: Logo im Hero-Bereich größer, ohne rechteckige Card im Hintergrund, Logo wird nicht mehr abgeschnitten (ohne Animation; statischer Schatten für mehr Tiefe)
- Navbar: Logo links oben mit Glint/Shimmer-Effekt (dezent; Intervall ~23s)
- Karte: Eigener Standort wird als Marker angezeigt (pulsierend; respektiert prefers-reduced-motion)
- Karte: Standort-Marker pulsiert deutlicher
- Wartungs-/Wartebildschirm: Text angepasst (kein "Wir" mehr)
- Admin: Startseiten-Logo (Hero) separat konfigurierbar (Upload, inkl. GIF)
- Admin → Design: Startseiten-Logo (Hero) ist auch im Branding-Bereich verwaltbar
- Startseiten-Logo (Hero): Upload-Limit erhöht und Video (mp4/webm) als Alternative zu GIF möglich
- Startseite: Hero zweigeteilt (links Blau/Primary, rechts Schwarz für Media) für saubere Darstellung von GIF/Video/Logo

## [Unreleased] - 2026-02-22

### 🧩 Gruppen

- Gruppen-Flyer: Button "Flyer Vorschau" wieder sichtbar auf Gruppen-Detailseite und in "Gruppe bearbeiten" (für Admins/Owner)
- Gruppen-Flyer PDF: Footer zeigt jetzt "Erstellt mit TribeFinder.de"; QR-Code und Footer-URL nutzen kanonische `SITE_URL` (Fallback: `NEXTAUTH_URL`)
- Gruppen-Flyer PDF: Details-Layout robuster (kein Überlagern von Standort/Training durch Kontakt-Block) + Tanzstile nutzen echte `danceStyles` (Fallback: Tags)
- Gruppen-Flyer PDF: Kontaktblock zeigt immer E-Mail + Website (mit Platzhalter falls nicht hinterlegt)
- Gruppen-Flyer PDF: Download-/Preview-Endpoint ist nicht mehr öffentlich (nur Owner/Gruppen-Admins/Global-Admins)
- Gruppen-Flyer PDF: DIN-A4 Layout stärker gerastert (fixe Bereiche) + deutlich mehr Platz für Beschreibung; TribeFinder-Logo im Footer
- Gruppen-Flyer PDF: "Über uns" wird wieder zuverlässig angezeigt (Layout strikt top-down; Boxen schrumpfen bei wenig Platz)
- Gruppen-Flyer PDF: Overlap-Fix (Kontaktblock unten verankert; Tanzstile/Events darüber)
- Gruppen: Neue öffentliche Steckbrief-Seite zum Drucken/Teilen unter `/groups/[id]/promote` (A4-Print-Layout + QR-Code)
- Gruppen: UI vereinfacht – statt PDF-Flyer Button gibt es jetzt den Steckbrief-Link (Promote-Seite)
- Gruppen: Steckbrief verbessert (Drucken-Button wieder verfügbar; Tanzstile zeigen Level + Impro/Choreo; Link-Text entfernt – QR genügt)
- Gruppen: Steckbrief-Druck optimiert (Print-Icon am Steckbrief-Button; beim Drucken werden Navbar/Footer ausgeblendet + höhere Kontraste)
- Gruppen: Steckbrief-Link öffnet in neuem Tab
- Gruppen: Steckbrief zeigt Gruppen-Logo; Safari-Druckvorschau fix (nur Steckbrief sichtbar via Print-CSS)
- Gruppen: Steckbrief ist jetzt immer hell (lesbar auch im Darkmode)
- Gruppen: Steckbrief zeigt optionalen Video-QR-Code, wenn ein Video verlinkt ist
- Gruppen: Gruppen-Übersicht (`/groups`) zeigt nun kompakt die Top 3 beliebtesten Gruppen (mit Like-Aufforderung)
- Gruppen: Sortierung "Beliebtheit" nutzt den gleichen Like-Zähler wie die Anzeige (Union aus `GroupLike` + legacy `FavoriteGroup`)
- Gruppen: Gruppenleitung/Mitglieder verlinken nur noch auf Tänzerinnen-Profile, wenn diese aktiviert sind (kein 404 beim Klick)

### 🧰 Admin

- Admin: Benutzerliste zeigt jetzt Tänzerinnenprofil-Status (aktiv/privat) zur Fehlersuche
- Admin: Benutzer-Detailseite zeigt jetzt Tänzerinnenprofil-Status (aktiv/privat)
- Admin: Benutzerliste zeigt Online/Offline Status
- Admin: Benutzer-Detailseite zeigt Online-Status + zusätzliche Debug-Felder (User ID, zuletzt aktualisiert)
- Admin: Ankündigungen/„What's new“-Modal verwaltbar unter `/admin/announcements` (mit Zeitraum + Warnung bei mehreren aktiven)

### 🗺️ Roadmap

- Auth/Security: konsistente Rate-Limits + Schutz für Write-Endpoints (inkl. Abuse-Schutz und klare Auth-Matrix Tests)
- Performance: Caching/ISR für öffentliche Listen (Gruppen/Events/Tänzerinnen/Marketplace) + Query-Optimierungen/Pagination

## [Unreleased] - 2026-02-25

### 💃 Tanzstile

- Öffentliche Tanzstile-Übersicht unter `/dance-styles` mit Suche sowie Counts für Gruppen & Tänzerinnen (nur Profile mit `isDancerProfileEnabled = true`)
- Öffentliche Tanzstil-Detailseiten unter `/dance-styles/[id]` inkl. Website/Beschreibung/„früherer Name“ sowie optionalem Video-Link (YouTube wird eingebettet)
- Tanzstile: Vorschlagsformular für neue Stile (nur eingeloggte User); Vorschläge sind nicht öffentlich sichtbar bis zur Admin-Freigabe
- Tanzstile: Änderungsvorschläge für bestehende Tanzstile (nur verifizierte User) inkl. Felder wie Website/Beschreibung/Video/„früherer Name“
- Admin: Review-Seite für Tanzstil-Vorschläge unter `/admin/dance-style-suggestions` (Freigeben/Ablehnen)
- Datenmodell: Neues Prisma-Model `DanceStyleSuggestion` inkl. Status (PENDING/APPROVED/REJECTED)
- Seed: Default-Liste ergänzt um **ITS** und **Wüstenrosen ATS**
- Admin: Zentrale Tanzstil-Verwaltung unter `/admin/dance-styles` (manuell hinzufügen/bearbeiten/löschen)
- Admin: Tanzstile können jetzt auch einen optionalen Video-Link speichern (für Detailansicht)
- Admin: Legacy-Tag-Verwaltung (`/admin/tags`, Admin → Inhalte) auf zentrale Tanzstil-Verwaltung umgestellt
- Gruppen: Tanzstil-Filter lädt Tanzstile zentral aus `/api/dance-styles` (kein leerer Dropdown mehr)
- Tänzerinnen: Tanzstil-Filter in der Übersicht (`/taenzerinnen`) ergänzt
- Admin: Tanzstil-Vorschläge werden oben auf `/admin/dance-styles` eingeblendet, wenn offene Vorschläge existieren (Approve/Reject direkt dort)
- Admin: E-Mail-Benachrichtigung an Admins bei neuem Tanzstil-Vorschlag

### 🧭 Navigation

- Navbar: Primärlinks auf Gruppen/Tänzerinnen/Events/Karte fokussiert; Tanzstile + Second-Hand unter „Mehr“ (Desktop Dropdown + Mobile aufklappbar)

### 📍 Standort

- Startseite: Standort wird erst nach Klick („Standort aktivieren“) abgefragt (kein automatisches GPS-Popup beim Seitenaufruf)

## [Unreleased] - 2026-02-27

### 💃 Tanzstile

- Einmalige Initialbefüllung: Tanzstil-Infos (Beschreibung/Webseite/Video) für bestehende Einträge werden per Migration gesetzt (danach Pflege über Frontend)
- Einmalige Ergänzung: Fehlende Tanzstile aus der initialen Liste werden angelegt und mit Infos befüllt (danach Pflege über Frontend)
- Einmalige Zuordnung: Kategorien für Tanzstile werden gesetzt (Oriental/Tribal/Fusion/Folklore/Modern/Sonstiges)
- Detailseite: Video-Bereich wird nur angezeigt, wenn das verlinkte YouTube-Video verfügbar ist
- Admin: Änderungsvorschläge zeigen Alt/Neu (Vergleich) für bessere Freigabe-Entscheidungen; Freigabe kann Felder auch leeren (setzt NULL)

### 🔎 SEO

- Events: Kalender-Seite (`/events`) wird serverseitig gerendert (bessere Indexierbarkeit, kein Client-only Fetch)

## [Unreleased] - 2026-03-05

### 🔗 Links

- Neue öffentliche Linkseite (`/links`) mit aktiven Links + Archiv (offline)
- Eingeloggte Nutzer können Links vorschlagen (PENDING), Admins können freigeben/ablehnen (`/admin/links`)
- Nutzer können Änderungen an bestehenden Links vorschlagen; Admins können Vorschläge prüfen (Diff) und freigeben/ablehnen
- Admin: E-Mail-Benachrichtigung an alle Admins bei neuen Link-Änderungsvorschlägen
- Admin: Links können vollständig angelegt/bearbeitet/gelöscht werden (CRUD)
- Automatische tägliche Prüfung der Erreichbarkeit (Healthcheck): HTTP >= 400 zählt als offline; nach 3 Fehlschlägen Archivierung; automatische Reaktivierung bei Erfolg
- Links unterstützen Kategorien (z.B. Tanzschule) sowie PLZ/Ort als Grundlage für zukünftige Karten-Integration
- Standort wird best-effort geocoded (PLZ/Ort → `lat/lng`) für spätere Karten-Integration
- Karte (`/map`): Links werden als Marker angezeigt (inkl. Kategorie im Popup; Toggle im Filter)
- Kategorien für Links sind nun als verwaltete Dropdown-Liste umgesetzt (User/Admin/Suggestions); Admin kann Kategorien einsehen und neue anlegen
- Karte: Links mit identischer PLZ/Ort werden auf der Karte leicht auseinandergezogen (Jitter), damit Marker einzeln anklickbar bleiben
- Admin: Einmaliger Backfill-Endpoint zum Nachziehen von Link-Kategorien aus bestehenden Link-Daten (für laufende Systeme)
- Admin: Link-Kategorien können umbenannt/gelöscht werden (bei Verwendung wird Löschen verhindert)
- Karte: Link-Filter zeigt Kategorien einzeln (statt pauschal "Links"); Admin kann pro Kategorie steuern, ob sie auf der Karte angezeigt wird ("In Karte anzeigen")
- Startseite: Links-Kennzahlen zeigen Gesamtzahl der freigegebenen Link-Einträge sowie eine Kachel pro Kategorie (mit Anzahl)
- Startseite: Kategorie-Kacheln verlinken direkt auf gefilterte Linkliste (`/links?category=...`)
- Startseite: Links-Kennzahlen optisch vereinheitlicht (Kachel "Links" entfernt; gleiche Höhen; Kategorie-Kacheln 4 Spalten auf Desktop)
- SEO: Gefilterte Linklisten werden per `robots: noindex` vor Duplicate Content geschützt
- Links-Seite: Kategorie-Chips als Schnellfilter + Canonical-URL (`/links`) für saubere Indexierung

### 🧰 Admin

- Einstellungen: Matomo-Abschnitt zeigt nach „Speichern“ wieder eine Statusmeldung (Feedback)
- Admin: Online-Zähler "Eingeloggt online" nutzt jetzt korrekt das 5-Minuten-Fenster (statt historischer Last-Seen Werte)
- Admin: Online-Kachel Beschriftung präzisiert ("Besucher online" vs. "Eingeloggt online (letzte 5 Minuten)")

### 🧭 Navigation

- Footer: Links im Footer sind nun in Sektionen unterteilt (Rechtliches/Mehr/Community) für bessere Übersicht
- Hilfe: Icons für Tänzerinnen/Gruppen korrigiert; Links-Seite in Hilfe ergänzt
- Startseite: "Was bietet TribeFinder?" ergänzt um Links
- Startseite: "Was bietet TribeFinder?" Kacheln optisch vereinheitlicht (Icon-Badges, gleiche Höhen, klare CTA)
- Favicon: Standard-Favicon (`/favicon.ico`) explizit in Metadata-Icons hinterlegt (bessere Browser-Kompatibilität)
- Responsiveness: Horizontales Overflow reduziert (Link-Chips umbrechbar; Footer-Version bricht lange Hashes)
- SEO: JSON-LD Structured Data robuster (WebSite/Organization via `@graph`) – verhindert Runtime-Fehler
- Startseite: Feature-Kachel-Titel auf max. 2 Zeilen geklemmt für bessere Lesbarkeit
- Startseite: Feature-Kacheln weniger gequetscht (max. 3 Spalten, bessere Abstände)
- Build: Next.js TypeScript-Typen für `/links` korrigiert (searchParams Promise-Kompatibilität)
- Karte: Gruppen-Popup – Logo/Overlay blockiert nicht mehr den Klick auf "Profil ansehen"
- Mobile: Feedback-Link wieder im Konto-Menü verfügbar
- Karte: Filter-Panel auf Mobile kompakter und aufklappbar
- Karte: Popups schließen weniger aggressiv bei Klick/Tap (Landscape-freundlicher)
- Security: Dependencies aktualisiert (Next.js Patch-Update; DOMPurify/jsPDF Fixes; Overrides für transitive Vulnerabilities)
- Gruppen: Like-Zähler konsistent gemacht (zählt auch legacy Favoriten/`FavoriteGroup` in Listen, Detailseite und Like-Endpoint)

### 🍪 Datenschutz

- Consent: Dezenter Cookie-/Consent-Banner unten + Einstellungs-Dialog (Notwendig/Matomo/YouTube)
- Consent: Matomo-Tracking und YouTube-Embeds werden erst nach Zustimmung geladen; Footer-Link "Cookie-Einstellungen" zum späteren Ändern
- Rechtstexte: Datenschutzerklärung/Impressum sowie Cookie-Hinweise sprachlich auf Einzelperson angepasst ("ich" statt "wir")

### 🛠️ Admin

- Admin: Online-Card bekommt einen manuellen "Jetzt prüfen"-Button + Detailansicht zur Verifikation der Online-Besucherzählung

### 📱 Mobile

- PWA: Ungelesene Nachrichten können (wenn unterstützt) als Badge-Zahl am App-Icon angezeigt werden; Navbar nutzt dafür den bestehenden Unread-Count Endpoint
- PWA: Dezente Install-Promo (ohne Sticky-Banner) im Profilbereich, im Konto-Menü sowie unten auf der Startseite inkl. Anleitung für Android/iOS

## [Unreleased] - 2026-02-28

### 🏷️ Tags

- Tags unterstützen Typen (GENERAL/DIALECT/PROP) und können über die API gefiltert werden
- Gruppen: Dialekte/Schulen und Props können separat als Tags gepflegt werden (Mehrfachauswahl)

### 💃 Tanzstile

- Aliase/Synonyme für Tanzstile (z.B. ATS/American Tribal Style) werden in der Auswahl angezeigt, aber als kanonischer Stil gespeichert (z.B. FCBD Style)
- Nutzer können Änderungen am Tanzstil vorschlagen (Inhalte wie Beschreibung/Links/Kategorie) und verifizierte Nutzer können zusätzlich neue Tanzstil-Aliase vorschlagen; Admin kann diese freigeben/ablehnen
- Weitere Aliase wurden vor-seeded (u.a. Global Caravan/Gypsy Caravan, ITS/Improvisational Tribal Style, BlackSheep BellyDance/BSBD, Salimpour Format)
- Defensive Migration: vorhandene Legacy-Tanzstile aus dem Live-System (z.B. Gypsy Caravan, Improvisational Tribal Style (ITS), BlackSheep) werden automatisch auf kanonische Stile gemerged (inkl. Gruppen-/User-Zuordnungen)
- Admin-Diagnose: neuer Integritätscheck für DanceStyles (Orphans, Duplikate, Legacy-Namen)

### 🧭 Presence

- „Zuletzt online“ wird nicht mehr nach 5 Minuten zu „unbekannt“ (Last-Seen Retention: 30 Tage statt Online-Fenster)

### 🧭 Navigation

- Footer: Facebook-Seite verlinkt
- Footer: Facebook-Icon statt Textlink
- Footer: GitHub-Icon statt Textlink

### 🔐 Auth

- Registrierung/Login: Hinweise zur E-Mail-Verifizierung nach der Registrierung klarer formuliert

### 💃 Tanzstile

- Dropdowns/Filter laden Tanzstile immer aktuell aus der DB (kein Stale Cache; Refresh beim Öffnen)
- Gruppen/Tänzerinnen: Tanzstil-Filter sind konsistent und nutzen DanceStyle IDs (Query-Param `danceStyleId`, Legacy-Params bleiben kompatibel)
- Filter: Dropdowns zeigen nur noch Tanzstile, die tatsächlich verwendet werden (pro Kontext: Gruppen/Events/Tänzerinnen)
- Prisma: Schema-Relation für Tanzstil-Vorschläge korrigiert (migrate/generate laufen wieder)
- Tanzstile: Safety-Logging für Ladeprobleme (API + Gruppen-Editor)
- Gruppen bearbeiten: Tanzstil-Dropdown bleibt offen beim Nachladen (kein "Laden"-Flicker)
- Cleanup: Entfernt Fallback-Workarounds für veralteten Prisma Client (Deployment läuft mit `migrate deploy` + `generate`)

### 🧩 Events

- Events: Tanzstile können optional ausgewählt werden und sind im Kalender filterbar (Query-Param `danceStyleId`)
- Events: Nach dem Erstellen wird direkt zur Event-Detailseite weitergeleitet
- Event-Formular: Adresseingabe verbessert (PLZ/Ort zuerst, geführte Suche)
- Events: Aktion-Buttons vereinheitlicht (Löschen als Icon-Button)
- Events: Filter zeigt Hinweis, wenn noch keine Tanzstile in Events vorhanden sind
- Events: Hinweis im Formular und auf der Detailseite, damit bestehende Events leichter um Tanzstile ergänzt werden können
- Events: Filter erweitert um Standort/Umkreis (wie Gruppen) und Monats-Auswahl (nur Monate mit zukünftigen Events)
- Events: Events-Header/Filter optisch an Gruppen-Seite angepasst (Button-Ausrichtung, Monats-Labels)
- Events: Lint-Fixes im Event-Filter (kein setState im Effect, keine `any`-Typen)

### 👥 Gruppen

- Gruppen: Tanzstile-Auswahl in der Gruppenerstellung auf Mobile (iOS/Android) repariert (Select-Overlay wurde durch Reload beim Fokus geschlossen)

### 🧭 Navigation

- Navbar: API-Requests nutzen aktuelle Origin (kein CORS mehr bei Zugriff über lokale IP)
- Next.js: Deprecated `middlewareClientMaxBodySize` durch `proxyClientMaxBodySize` ersetzt

### 📣 Marketing

- Marketing: Corporate Identity ergänzt (Schriftart Marcellus für Copper, Logo-Farben #C7643C / #e7bf73)

### 🧰 Maintenance

- npm audit: `npm audit fix` (ohne `--force`) ausgeführt und Lockfile aktualisiert; verbleibende Findings erfordern Major-Updates
- Tests: Regressionstest für `POST /api/events` (inkl. `danceStyleIds`), damit kaputte Event-Erstellung sofort auffällt
- Admin: Diagnostics prüft Prisma-Relation `Event.danceStyles` explizit

## [Unreleased] - 2026-03-01

### 🧰 Admin

- Admin: Ankündigungen/„What's new“-Modal: Vorschau-Button im Editor (ohne Speichern)

### 📣 What's new (Modal)

- Neues globales „What's new“-Modal für eingeloggte Nutzer (zeigt neueste aktive Ankündigung einmal pro User, inkl. Dismissal)
- Copper-Design: Header mit Branding-Farben, Button nutzt `--primary`, kleines Logo im Header (Branding-Logo mit Fallback)
- Robustheit: Textumbruch/Scroll bei viel Inhalt, damit nichts aus dem Modal herausläuft

### 💃 Tanzstile

- Seed: Tanzstile werden nur einmal initial angelegt (Flag in `SystemSetting`) und nicht automatisch erneut erzeugt, wenn Admins Einträge löschen

## [Unreleased] - 2026-02-20

### 🗺️ Karte

- Marker-Clustering für Gruppen und Events (bessere Übersicht und Performance)

### 🧩 Events

- Trust-Hinweise: Adress-/Positions-Check im Event-Formular + Hinweis bei abgelaufenen Events (inkl. Duplizieren-Flow)

### 🧩 Gruppen

- Tanzstile: `DanceMode` um Option **Beides (BOTH)** erweitert
- Gruppen: Neues optionales Textfeld **Accessoires** (Create/Edit + Anzeige auf Gruppenseite)

### 🖼️ Uploads

- Upload Limit für Bilder/Flyer auf **15MB** erhöht
- Upload UX: Klarere Fehlermeldungen aus dem Backend werden im UI angezeigt (statt generischem "Upload fehlgeschlagen")
- Upload UX: Hinweistext mit Maximalgröße direkt an den Upload-Feldern (Gruppen-Form, Gruppen-Wizard, Event-Form)

### 💃 Tanzstile

- Default-Liste ergänzt: **Oriental Fusion** (Seed-Scripts + API Default-Seeding)

### 🧰 Admin / Transfer

- Transfer-Upload API: Fallback für Raw-Uploads (`application/gzip`/`octet-stream`) zusätzlich zu Multipart
- Tests: Transfer Upload Test an Vitest-Umgebung angepasst

### 🛍️ Marketplace (Second-Hand Börse)

- Inserate: Create/Detail/Edit/Delete komplett (Owner/Admin Berechtigungen)
- Standort: Geocoding best-effort (keine 500er bei externen Fehlern) + Soft-Warnung bei PLZ/Ort-Mismatch
- Validierung/UX: Pflichtfelder konsistent (Preis: Pflicht bei „Ich biete“, optional bei „Ich suche“), Input-Sanitization (PLZ 5-stellig, Preis/Versand nur Zahlformat)
- Detailansicht: zusätzliche Infos (Datum/Location-Quelle) + Admin/Owner Aktionen
- Legacy-Listings: Standort-Anzeige robust bei älteren Inseraten ohne PLZ/Ort
- Architektur: Marketplace-Übersicht lädt Inserate über `/api/marketplace` (statt Prisma direkt)

### 💬 Direktnachrichten

- E-Mail Benachrichtigung bei neuer Nachricht: Link führt direkt in den passenden Thread (`/direct-messages/[otherUserId]`)
- Profil: Optionale Einstellung, ob bei neuen Direktnachrichten eine E-Mail gesendet wird
- E-Mail Throttle: Maximal eine Benachrichtigung pro Kontakt alle 10 Minuten (Spam-Schutz)
- E-Mail Links: Deep-Links nutzen `NEXTAUTH_URL` (Fallback: `SITE_URL`) – kein kaputter Button wenn Base-URL fehlt

### 🧩 UI / UX

- Gruppenliste: Filter UX auf Mobile verbessert
  - Oben nur noch Suche + Sortierung
  - Tanzstil + Standort/Umkreis im Accordion „Filter“
  - Sortierung „Entfernung“: Hinweis + Accordion-Öffnung wenn Standort fehlt
- Tänzerinnen-Übersicht (`/taenzerinnen`): Layout/Filter wie Gruppenübersicht (Suche, Sortierung, Filter)
- Tänzerinnen-Profile: Phase 2 Felder ergänzt (Unterricht + Ort, Schwerpunkte, Ausbildung/Training, Auftritte/Referenzen) + Filter „Unterricht“
- Tänzerinnen-Profile: Workshops + „Für Auftritte buchbar“ + Konditionen (Freitext) + Filter „Workshops“
- Gruppenseite: Öffentliche Sidebar zeigt jetzt Gruppenleitung (Owner + Admins) und Mitgliederliste (erste 12 + „Mehr“)
- User-Profil: Gruppenliste zeigt jetzt Rolle (Mitglied/Gruppenleitung) und Beitrittsdatum
- Neue Hilfeseite `/hilfe` und Link im Footer

### 🛠️ Wartungsmodus

- Wartungsmodus (MAINTENANCE_MODE) blockiert Schreibzugriffe serverseitig (HTTP 503)
  - via `src/proxy.ts` (Next.js 16 Proxy-Konvention)
- Globales Wartungs-Banner

### 🧰 Installation / Setup

- Setup-Script (`scripts/setup-native.sh`) bricht bei ungültigen Eingaben nicht mehr hart ab
  - NEXTAUTH_URL: bei ungültiger URL erneut abfragen
  - SMTP + Admin E-Mail + DB Passwort: bei ungültig/leer erneut abfragen
  - SMTP Verify: Abbruch entfernt, stattdessen Warnung + Hilfe (STARTTLS vs SMTPS)

### � PWA (iOS)

- iOS Home-Screen Icon verbessert
  - `apple-touch-icon.png` hinzugefügt
  - Manifest um PNG Icons ergänzt
  - Favicon/App-Icon: SVG Logo wird zusätzlich als Icon ausgeliefert (neben PNG Fallbacks)

### �🔧 Deployment / Datenbank

- PostgreSQL-only: SQLite komplett entfernt
  - Entfernte Prisma SQLite-Migrations-History (`prisma/migrations` inkl. `migration_lock.toml`)
  - Setup/Deploy nutzen `prisma db push`
  - Backup/Restore/Auto-Backup via `pg_dump`/`psql`

### 🧪 Tests

- Playwright E2E: Neuer Test für Inbox-Thread (Edit/Delete bis gelesen)

### 🔧 Geändert

- Event-Erstellung: Datum/Uhrzeit Eingabe UX überarbeitet (native Date/Time Picker, Safari-kompatibel)
- Event-Formular: Automatisches Setzen der Endzeit (+90 Minuten) solange Ende nicht manuell geändert wurde
- Event-Formular: Beim Bearbeiten wird das Ende beim Verschieben des Starts mitverschoben (inkl. Hinweis)
- Event-Formular: Inline-Validierung + Scroll zum ersten Fehler
- Event-Formular: Zeitzone aus dem Browser wird als Info angezeigt
- Formular-Layout: Ticket-Link/Preis unter Webseite neu angeordnet

#### SEO
- `robots.txt` und `sitemap.xml` werden jetzt server-seitig generiert (Next.js Metadata Routes)
- Sitemap nutzt bevorzugt `SITE_URL` (Fallback: `NEXTAUTH_URL`) als Basis
- Globales Default-SEO verbessert (Description, OpenGraph, Twitter Cards)

### 🐛 Behoben

- "Ungültiger Wert" bei Datum/Uhrzeit Eingabe in Safari (Browser-Validation der versteckten Inputs)
- Weiterleitung nach Event-Erstellung für Events ohne Gruppe
- Event löschen: Delete-Button auf Detailseite + API-Route für Events ohne Gruppe
- Öffentliche Seiten: Nicht eingeloggte Nutzer sehen wieder Gruppenlogos/Profilbilder (Uploads werden nicht mehr auf Login umgeleitet)

### 🎉 Neu hinzugefügt

- Tänzerinnen-Profile: Optional im Nutzerprofil aktivierbar (inkl. Privat-Option) und sichtbar in `/taenzerinnen` + Gruppen-Detailseiten

### 🎉 Neu hinzugefügt

#### UX Verbesserungen
- **Toast Notifications System** - Moderne Benachrichtigungen statt Browser-Alerts
  - 4 Typen: success, error, warning, info
  - Auto-Dismiss nach 5 Sekunden
  - Manuelles Schließen möglich
  - Integriert in allen Formularen und User-Interaktionen
  
- **Skeleton Loader** - Loading-Platzhalter für bessere wahrgenommene Performance
  - Gruppen-Listenseite (`/groups`)
  - Event-Listenseite (`/events`)
  - Passt exakt zum finalen Layout (keine Layout-Shifts)

#### Stabilität & Fehlerbehandlung
- **Error Boundary** - Globale Fehlerbehandlung für React Components
  - Zeigt benutzerfreundliche Fehlermeldungen
  - Entwickler-Details nur in Development-Modus
  - "Seite neu laden" Button

#### Sicherheit
- **Security Headers** in `next.config.ts`
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy
  - Permissions-Policy

#### Installation & Deployment
- **Native Ubuntu LXC Installation**
  - Automatisches Setup-Script (`scripts/setup-native.sh`)
  - Deployment-Script (`scripts/deploy-native.sh`)
  - Systemd Service-Konfiguration
  - Vollständige Dokumentation in `INSTALL_NATIVE.md`

- **Troubleshooting Guide** (`TROUBLESHOOTING.md`)
  - Prisma Version-Konflikte
  - Service-Probleme
  - Datenbank-Probleme
  - Upload-Fehler

- **Weitere Dokumentation**
  - `QUICKSTART.md` - 3-Schritte-Installation
  - `MIGRATION.md` - Umzug / Migration

### 🔧 Geändert

#### Installation
- **Prisma-Befehle** - Nutzen jetzt npm scripts statt `npx prisma`
  - Verhindert automatische Installation von Prisma 7.x
  - Nutzt lokale Prisma 5.10.2 Version
  - Alle Scripts und Dokumentation aktualisiert

#### Gruppen-Seite
- Von Server Component zu Client Component konvertiert
- Implementiert Loading States mit `useState`/`useEffect`
- Zeigt Skeleton Loader während des Ladens

### 🐛 Behoben

- **Prisma Version-Konflikt** auf Ubuntu 24.04
  - `npx prisma` installierte automatisch v7.2.0 (breaking changes)
  - Jetzt: `npm run db:generate` und `npm run db:migrate`
  
- **Alle Browser-Alerts ersetzt**
  - 15+ `alert()` Aufrufe durch Toast Notifications ersetzt
  - Betrifft: Gruppen, Events, Feed, Karte, Admin-Bereich

### 📝 Dokumentation

- README.md aktualisiert - Native Installation als Hauptoption
- OPTIMIZATIONS.md aktualisiert - Status aller Features
- Neue npm scripts: `npm run setup`, `npm run deploy`

### ✅ Validierung

- **Input Sanitization**: Bereits via Zod-Schemas in allen API-Routes implementiert
- **Rate Limiting**: Bereits vorhanden für kritische Endpoints
- **Magic Bytes Validation**: Bereits vorhanden für File-Uploads

---

## Installation

### Native Installation (empfohlen)
```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
sudo ./scripts/setup-native.sh
```

Siehe `INSTALL_NATIVE.md` für Details.

----

**Letzte Aktualisierung:** 04. Februar 2026
