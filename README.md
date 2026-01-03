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

Die Anwendung kann entweder lokal (für Entwicklung) oder per Docker (empfohlen für Server/Produktivbetrieb) betrieben werden.

### Voraussetzungen (Ubuntu/Debian)

- **Git**
- **Docker Engine** + **Docker Compose Plugin** (`docker compose`)
- Optional für lokale Entwicklung ohne Docker: **Node.js 20+** und **npm**

Getestet/empfohlen:

- **Debian 12 (bookworm)**: empfohlen für Serverbetrieb
- **Ubuntu 22.04/24.04**: funktioniert ebenfalls

Hinweis zu **Debian 13 (trixie)**: Das offizielle Docker APT-Repo liefert für `trixie` nicht immer alle Pakete im `stable` Channel (z.B. 404 bei `containerd.io`). In diesem Fall entweder:

- Docker über Debian-Pakete installieren (`docker.io`), oder
- ein unterstütztes System wie Debian 12 nutzen.

Beispiel (Ubuntu/Debian) für Git:

```bash
sudo apt update
sudo apt install -y git
```

Docker Installation (Ubuntu/Debian, Docker Engine + Compose Plugin):

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
docker --version
docker compose version
```

Alternative (falls Docker APT Repo fehlschlägt, z.B. Debian 13 trixie):

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
docker --version
docker-compose --version
```

Optional (damit du `docker` ohne `sudo` ausführen kannst):

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

### Produktivbetrieb (empfohlen): Docker Compose

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
   Der Prisma Client wird automatisch an einen benutzerdefinierten Ort (`src/generated/client`) generiert, um Konflikte mit Next.js Caching zu vermeiden.
   ```bash
   npx prisma migrate dev
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Die App ist nun unter `http://localhost:3000` erreichbar.

## Konfiguration

### Umgebungsvariablen (.env)
Erstelle eine `.env` Datei im Hauptverzeichnis (siehe `.env.example`):

```env
# PostgreSQL (empfohlen für Produktion)
DATABASE_URL="postgresql://tribefinder:password@localhost:5432/tribefinder?schema=public"

# Oder SQLite für einfache lokale Entwicklung:
# DATABASE_URL="file:./dev.db"

NEXTAUTH_SECRET="dein-geheimes-random-secret"
NEXTAUTH_URL="http://localhost:3000"

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

### Admin-Bereich
Der erste registrierte Benutzer sollte manuell in der Datenbank zum ADMIN befördert werden, oder du nutzt das `prisma studio`:
```bash
npx prisma studio
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

## Deployment (ausführliche Anleitung)

Für eine Schritt-für-Schritt Anleitung für frische Debian/Ubuntu Systeme (inkl. Nginx/SSL Hinweise) siehe `DEPLOY.md`.
