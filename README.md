# TribeFinder

Eine moderne Plattform für Tanzgruppen (Tribal Style, Fusion & mehr) zur Verwaltung von Mitgliedern, Events und mehr.

## Features

- **Gruppenverwaltung**: Erstelle und verwalte Tanzgruppen-Steckbriefe.
- **Tänzerinnen-Profile**: Optional im Profil aktivierbar und in der Übersicht `/taenzerinnen` sichtbar.
  - Privat-Option: Private Profile sind nur für eingeloggte Besucher sichtbar.
  - Verknüpft: Profile zeigen zugehörige Gruppen (Mitgliedschaften).
  - Optional: Unterricht (wo), Unterricht-Schwerpunkte, Ausbildung/Training, Auftritte/Referenzen.
  - Optional: Workshops, buchbar für Auftritte, Konditionen (Freitext).
- **Event-Management**: Plane Auftritte und Veranstaltungen.
- **Interaktive Karte**: Finde Gruppen und Events in deiner Nähe (basierend auf OpenStreetMap).
- **Community Feed**: Ein "Schwarzes Brett" für Austausch und Neuigkeiten.
- **Mitgliederbereich**: Rollenbasierte Zugriffsrechte (Admin/Mitglied).
- **Marketplace (Second-Hand)**: Inserate (Kostüme, Schmuck, Accessoires, Schuhe, Sonstiges) mit Bildern, Standort/Umkreis-Filter und Versandoption.
  - Preis ist Pflicht bei „Ich biete“ und optional bei „Ich suche“.
- **Gruppen Likes**: "Gefällt mir" (Herz) für Gruppen mit Zähler und Toggle-Button.
- **Direktnachrichten**: 1:1 Messaging zwischen Nutzern (z.B. für Marketplace Kontakt) inkl. optionaler E-Mail Benachrichtigung bei neuen Nachrichten.
- **Datenschutzfreundlich**: Keine externen Tracker (außer optional Matomo), lokale Datenhaltung.

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Database**: PostgreSQL (via Prisma ORM)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet & OpenStreetMap
- **Auth**: NextAuth.js
- **Mail**: Nodemailer (SMTP)

## Installation & Setup

TribeFinder läuft lokal/serverseitig über HTTP auf Port 3000.

### Voraussetzungen

**Für Installation:**
- Ubuntu 22.04/24.04 oder Debian 12
- Node.js 20+
- Git

### 🚀 Schnellstart: Native Installation (Ubuntu LXC)

Die einfachste Methode für Ubuntu LXC Container:

```bash
# Repository klonen
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder

# Automatisches Setup-Script ausführen
sudo ./scripts/setup-native.sh
```

Das Script führt automatisch aus:
- Installation von Node.js und Dependencies
- Erstellen des tribefinder Users
- Datenbank-Setup
- Systemd Service-Konfiguration

**Detaillierte Anleitung:** Siehe `INSTALL_NATIVE.md`

Hinweise:

- Für reproduzierbare Builds nutzt das Setup/Deploy vorzugsweise `npm ci --include=optional` (u.a. wegen Tailwind/Turbo optional dependencies).
- Uploads werden in `public/uploads` gespeichert. Wichtig sind korrekte Dateirechte (Owner: `tribefinder`).

### Entwicklung (lokal)

1. **Repository klonen**
   ```bash
   git clone https://github.com/Schello805/TribeFinder.git
   cd TribeFinder
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Datenbank vorbereiten**
   ```bash
   npm run db:migrate:dev
   ```

   Hinweis: Neue Features können zusätzliche Migrationen enthalten (z.B. Gruppen-Likes). Danach ggf. auch den Prisma Client aktualisieren:
   ```bash
   npm run db:generate
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Die App ist nun unter `http://localhost:3000` erreichbar.

5. **Checks (empfohlen)**
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

Hinweis: Wenn du sowohl `.env` als auch `.env.local` verwendest, überschreibt `.env.local` die Werte aus `.env`. Achte darauf, dass `DATABASE_URL` konsistent ist.

5. **E2E Tests (Playwright, optional)**
   ```bash
   npm run e2e
   ```
   Benötigt zwei Test-Accounts:
   ```bash
   export E2E_EMAIL_1="..."
   export E2E_PASSWORD_1="..."
   export E2E_EMAIL_2="..."
   export E2E_PASSWORD_2="..."
   ```

---

## Konfiguration

### Umgebungsvariablen (.env)
Erstelle eine `.env` Datei im Hauptverzeichnis (siehe `.env.example`):

```env
# PostgreSQL
DATABASE_URL="postgresql://tribefinder:password@localhost:5432/tribefinder?schema=public"

NEXTAUTH_SECRET="dein-geheimes-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# E-Mail-Adresse, die bei der Registrierung automatisch ADMIN wird
DEFAULT_ADMIN_EMAIL="admin@example.com"

# Optional (SEO): Wird für Canonical-URL, OpenGraph und die Generierung von robots.txt/sitemap.xml verwendet.
# Fallback ist NEXTAUTH_URL.
SITE_URL="http://localhost:3000"

# SMTP (erforderlich für E-Mail-Verifizierung; kann später im Admin-Bereich geändert werden)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""

# Optional: Matomo-Origin (für CSP-Allowlist)
MATOMO_URL=""

# Wartungsmodus (optional)
# Wenn aktiv, werden Schreib-Requests (POST/PUT/PATCH/DELETE) mit HTTP 503 geblockt.
# Erlaubte Werte: 1/true/yes/on
MAINTENANCE_MODE="0"
```

### Wartungsmodus (Maintenance Mode)

- Wenn `MAINTENANCE_MODE` aktiv ist, sind **Änderungen/Uploads vorübergehend deaktiviert**.
- Schreib-Requests werden mit **HTTP 503** beantwortet (Header `Retry-After: 300`).
- Hinweis: In Next.js 16+ heißt die Dateikonvention dafür `src/proxy.ts` (statt `middleware.ts`).

### Gruppen Likes

- Likes werden pro Nutzer und Gruppe gespeichert (1 Like pro Nutzer/Gruppe).
- API Endpoint:
  - `GET /api/groups/[id]/like` → `{ count, likedByMe }`
  - `POST /api/groups/[id]/like` → Like setzen
  - `DELETE /api/groups/[id]/like` → Like entfernen
- UI:
  - Herz-Button mit Anzahl in Gruppenliste und auf der Gruppendetailseite.

### Hinweise für Serverbetrieb

- PostgreSQL läuft nativ (oder extern) und wird über `DATABASE_URL` angebunden.
- Uploads werden unter `public/uploads` auf dem Host gespeichert.
- Vor Updates, die Migrationen enthalten, sollte immer ein Backup der DB erstellt werden (das Update-Script übernimmt das).

### SEO / Indexierung
- Die App generiert `robots.txt` und `sitemap.xml` server-seitig.
- Für Test-/Staging-Subdomains wird empfohlen, im Reverse Proxy einen Header zu setzen:
  - `X-Robots-Tag: noindex, nofollow, noarchive`

### Admin-Bereich
Der erste registrierte Benutzer sollte manuell in der Datenbank zum ADMIN befördert werden, oder du nutzt Prisma Studio:
```bash
npm run db:studio
```
Registriere dich mit der im Setup gesetzten `DEFAULT_ADMIN_EMAIL` (diese wird automatisch `ADMIN`).

Im Admin-Bereich (`/admin`) können konfiguriert werden:
- **SMTP-Server**: Für den Versand von E-Mails.
- **Matomo Tracking**: URL und Site-ID für datenschutzkonforme Webanalyse.

## Datenschutzhinweise

- **Hosting**: Die Anwendung ist für das Hosting auf eigenen Servern ausgelegt. Alle Daten (Datenbank, Bilder) liegen lokal.
- **Externe Dienste**:
  - **OpenStreetMap**: Die Kartenkacheln werden direkt von OSM-Servern geladen. Hierbei wird die IP-Adresse des Nutzers an OSM übermittelt.
  - **Matomo**: Optional. Wenn konfiguriert, wird das Tracking-Skript von *deiner* Matomo-Instanz geladen.
- **Schriften**: Google Fonts werden durch Next.js lokal optimiert und nicht von Google-Servern geladen.

## Sicherheit (allgemein)

- Halte `NEXTAUTH_SECRET` geheim und verwende für Produktion einen langen, zufälligen Wert.
- Stelle sicher, dass die App ausschließlich über HTTPS erreichbar ist (Reverse Proxy/Load Balancer).
- Verwende in Produktion eine feste `DEFAULT_ADMIN_EMAIL` und gib Admin-Rechte nur gezielt.
- Halte Abhängigkeiten aktuell und prüfe regelmäßig auf Sicherheitsupdates.
- Erstelle vor Updates mit Migrationen immer ein Datenbank-Backup.

## Deployment

### Native Installation (empfohlen)
Siehe `INSTALL_NATIVE.md` für die vollständige Anleitung zur Installation auf Ubuntu/Debian.

**Schnell-Updates:**
```bash
sudo su - tribefinder
cd ~/TribeFinder
npm run deploy  # Führt deploy-native.sh aus
```

## Changelog

Siehe `CHANGELOG.md` für alle Änderungen und Updates.


<img width="1558" height="717" alt="Bildschirmfoto 2026-03-23 um 20 16 52" src="https://github.com/user-attachments/assets/fafc1913-8624-40ec-8ad5-a57fc52dab2b" />
<img width="1605" height="838" alt="Bildschirmfoto 2026-03-23 um 20 17 01" src="https://github.com/user-attachments/assets/a84bf40d-a650-4161-823d-24f3e4b4eebb" />
<img width="1580" height="836" alt="Bildschirmfoto 2026-03-23 um 20 17 15" src="https://github.com/user-attachments/assets/4201215e-6e83-4ac1-93f1-75705ce01854" />

