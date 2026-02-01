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

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Die App ist nun unter `http://localhost:3000` erreichbar.

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

# Optional (SEO): Wird für Canonical-URL, OpenGraph und die Generierung von robots.txt/sitemap.xml verwendet.
# Fallback ist NEXTAUTH_URL.
SITE_URL="http://localhost:3000"

# Optional: SMTP (wird durch Admin-Einstellungen überschrieben)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

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
Ändere die Rolle des Users in der Tabelle `User` auf `ADMIN`.

Im Admin-Bereich (`/admin`) können konfiguriert werden:
- **SMTP-Server**: Für den Versand von E-Mails.
- **Matomo Tracking**: URL und Site-ID für datenschutzkonforme Webanalyse.

## Datenschutzhinweise

- **Hosting**: Die Anwendung ist für das Hosting auf eigenen Servern ausgelegt. Alle Daten (Datenbank, Bilder) liegen lokal.
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

## Changelog

Siehe `CHANGELOG.md` für alle Änderungen und Updates.
