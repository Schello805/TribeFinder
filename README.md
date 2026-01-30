# TribeFinder

Eine moderne Plattform für Tanzgruppen (Tribal Style, Fusion & mehr) zur Verwaltung von Mitgliedern, Events und mehr.

## Features

- **Gruppenverwaltung**: Erstelle und verwalte Tanzgruppen-Steckbriefe.
- **Event-Management**: Plane Auftritte und Veranstaltungen.
- **Interaktive Karte**: Finde Gruppen und Events in deiner Nähe (basierend auf OpenStreetMap).
- **Community Feed**: Ein "Schwarzes Brett" für Austausch und Neuigkeiten.
- **Mitgliederbereich**: Rollenbasierte Zugriffsrechte (Admin/Mitglied).
- **Datenschutzfreundlich**: Keine externen Tracker (außer optional Matomo), lokale Datenhaltung.

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Database**: SQLite (via Prisma ORM)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet & OpenStreetMap
- **Auth**: NextAuth.js
- **Mail**: Nodemailer (SMTP)

## Installation & Setup

TribeFinder kann auf verschiedene Arten installiert werden:

1. **Native Installation (empfohlen)**: Direkt auf Ubuntu/Debian mit Node.js
2. **Docker**: Für isolierte Container-Umgebungen
3. **Lokal**: Für Entwicklung

### Voraussetzungen

**Für native Installation (empfohlen):**
- Ubuntu 22.04/24.04 oder Debian 12
- Node.js 20+
- Nginx (für Reverse Proxy)
- Git

**Für Docker:**
- Docker Engine + Docker Compose Plugin

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
- Installation von Node.js, Nginx und Dependencies
- Erstellen des tribefinder Users
- Datenbank-Setup
- Systemd Service-Konfiguration
- Nginx Reverse Proxy Setup
- Optional: SSL mit Let's Encrypt

**Detaillierte Anleitung:** Siehe `INSTALL_NATIVE.md`

Hinweise:

- Für SQLite in Produktion sollte `DATABASE_URL` ein **absoluter Pfad** sein (z.B. `file:/home/tribefinder/TribeFinder/prod.db`), damit Build/Runtime immer dieselbe DB verwenden.
- Für reproduzierbare Builds nutzt das Setup/Deploy vorzugsweise `npm ci --include=optional` (u.a. wegen Tailwind/Turbo optional dependencies).
- Uploads werden in `public/uploads` gespeichert. Wichtig sind korrekte Dateirechte (Owner: `tribefinder`).

---

### Alternative: Docker Installation

Für isolierte Container-Umgebungen oder Multi-Service-Setups.

**Detaillierte Docker-Anleitung:** Siehe `DEPLOY.md`

**Kurzversion:**

1. **Repository klonen**
   ```bash
   git clone https://github.com/Schello805/TribeFinder.git
   cd TribeFinder
   ```

2. **Persistente Ordner anlegen**
   ```bash
   mkdir -p db
   mkdir -p public/uploads
   ```

3. **Rechte setzen (wichtig für Uploads/DB im Container)**
   Der Container läuft als User `1001`. Stelle sicher, dass dieser schreiben darf:
   ```bash
   sudo chown -R 1001:1001 db public/uploads
   ```

4. **Konfiguration (Secrets!)**
   Passe in `docker-compose.yml` mindestens folgende Werte an:
   - `NEXTAUTH_URL` (deine Domain)
   - `NEXTAUTH_SECRET` (langes, zufälliges Secret)

5. **Starten**
   ```bash
   docker compose up -d --build
   ```

6. **Updates einspielen (empfohlen: mit Testlauf + Backup)**
   Im Repo liegt ein interaktives Update-Script:
   ```bash
   chmod +x scripts/update.sh
   ./scripts/update.sh
   ```
   Das Script macht einen Testlauf (Build + Migrationen auf DB-Kopie) und fragt erst danach, ob es live einspielen soll.

   Hinweis: `scripts/update.sh` ist für das **Docker** Setup gedacht. Für eine native Installation nutze `scripts/deploy-native.sh`.

### Entwicklung (lokal, ohne Docker)

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

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Die App ist nun unter `http://localhost:3000` erreichbar.

Hinweis: Wenn du sowohl `.env` als auch `.env.local` verwendest, überschreibt `.env.local` die Werte aus `.env`. Achte darauf, dass `DATABASE_URL` konsistent ist (empfohlen: `file:./prisma/dev.db`), damit nicht versehentlich eine leere `./dev.db` im Repo-Root verwendet wird.

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
# PostgreSQL (empfohlen für Produktion)
DATABASE_URL="postgresql://tribefinder:password@localhost:5432/tribefinder?schema=public"

# Oder SQLite für einfache lokale Entwicklung:
#
# Wichtig: Verwende in diesem Repo standardmäßig `prisma/dev.db`.
# (Ein `./dev.db` im Repo-Root kann leicht zu Verwechslungen führen.)
# DATABASE_URL="file:./prisma/dev.db"

NEXTAUTH_SECRET="dein-geheimes-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional (SEO): Wird für Canonical-URL, OpenGraph und die Generierung von robots.txt/sitemap.xml verwendet.
# Fallback ist NEXTAUTH_URL.
SITE_URL="http://localhost:3000"

# PostgreSQL Passwort (für Docker Compose)
POSTGRES_PASSWORD="sicheres-passwort"

# Optional: SMTP (wird durch Admin-Einstellungen überschrieben)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

### Lokale Entwicklung mit PostgreSQL

1. Starte PostgreSQL mit Docker:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Setze die DATABASE_URL in `.env`:
   ```env
   DATABASE_URL="postgresql://tribefinder:devpassword@localhost:5432/tribefinder?schema=public"
   ```

3. Führe Migrationen aus:
   ```bash
   npx prisma migrate dev
   ```

### Hinweise für Serverbetrieb

- PostgreSQL läuft als separater Container (siehe `docker-compose.yml`).
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
Ändere die Rolle des Users in der Tabelle `User` auf `ADMIN`.

Im Admin-Bereich (`/admin`) können konfiguriert werden:
- **SMTP-Server**: Für den Versand von E-Mails.
- **Matomo Tracking**: URL und Site-ID für datenschutzkonforme Webanalyse.

## Datenschutzhinweise

- **Hosting**: Die Anwendung ist für das Hosting auf eigenen Servern (z.B. VPS, Docker) ausgelegt. Alle Daten (Datenbank, Bilder) liegen lokal.
- **Externe Dienste**:
  - **OpenStreetMap**: Die Kartenkacheln werden direkt von OSM-Servern geladen. Hierbei wird die IP-Adresse des Nutzers an OSM übermittelt.
  - **Matomo**: Optional. Wenn konfiguriert, wird das Tracking-Skript von *deiner* Matomo-Instanz geladen.
- **Schriften**: Google Fonts werden durch Next.js lokal optimiert und nicht von Google-Servern geladen.

## Deployment

### Native Installation (empfohlen)
Siehe `INSTALL_NATIVE.md` für die vollständige Anleitung zur Installation auf Ubuntu/Debian.

**Schnell-Updates:**
```bash
sudo su - tribefinder
cd ~/TribeFinder
npm run deploy  # Führt deploy-native.sh aus
```

### Docker Installation
Siehe `DEPLOY.md` für die vollständige Docker-Anleitung.

## Changelog

Siehe `CHANGELOG.md` für alle Änderungen und Updates.
