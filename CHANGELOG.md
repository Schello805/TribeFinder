# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

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
- Gruppen: Gruppenleitung/Mitglieder verlinken nur noch auf Tänzerinnen-Profile, wenn diese aktiviert sind (kein 404 beim Klick)

### 🧰 Admin

- Admin: Benutzerliste zeigt jetzt Tänzerinnenprofil-Status (aktiv/privat) zur Fehlersuche
- Admin: Benutzer-Detailseite zeigt jetzt Tänzerinnenprofil-Status (aktiv/privat)
- Admin: Benutzerliste zeigt Online/Offline Status
- Admin: Benutzer-Detailseite zeigt Online-Status + zusätzliche Debug-Felder (User ID, zuletzt aktualisiert)

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

### 🧰 Admin

- Einstellungen: Matomo-Abschnitt zeigt nach „Speichern“ wieder eine Statusmeldung (Feedback)

## [Unreleased] - 2026-02-28

### 🏷️ Tags

- Tags unterstützen Typen (GENERAL/DIALECT/PROP) und können über die API gefiltert werden
- Gruppen: Dialekte/Schulen und Props können separat als Tags gepflegt werden (Mehrfachauswahl)

### 💃 Tanzstile

- Aliase/Synonyme für Tanzstile (z.B. ATS/American Tribal Style) werden in der Auswahl angezeigt, aber als kanonischer Stil gespeichert (z.B. FCBD Style)
- Nutzer können Änderungen am Tanzstil vorschlagen (Inhalte wie Beschreibung/Links/Kategorie) und verifizierte Nutzer können zusätzlich neue Tanzstil-Aliase vorschlagen; Admin kann diese freigeben/ablehnen
- Weitere Aliase wurden vor-seeded (u.a. Global Caravan/Gypsy Caravan, ITS/Improvisational Tribal Style, BlackSheep BellyDance/BSBD, Salimpour Format)
- Defensive Migration: vorhandene Legacy-Tanzstile aus dem Live-System (z.B. Gypsy Caravan, Improvisational Tribal Style (ITS), BlackSheep) werden automatisch auf kanonische Stile gemerged (inkl. Gruppen-/User-Zuordnungen)

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
