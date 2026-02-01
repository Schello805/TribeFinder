# Anleitung zum Deployen auf einem Debian Server

Diese Anleitung beschreibt, wie du "TribeFinder" auf deinem Debian Server installierst und startest.

## Voraussetzungen

Stelle sicher, dass auf deinem Server installiert sind:
1.  **Git**: `sudo apt update && sudo apt install git`
2.  **Docker**: [Installationsanleitung Docker](https://docs.docker.com/engine/install/debian/)
3.  **Docker Compose**: Meistens im Docker-Plugin enthalten (`docker compose`).

## 1. Repository klonen

Gehe in das Verzeichnis, in dem die App liegen soll (z.B. `/opt` oder `/home/dein-user`).

```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
```

## 2. Konfiguration

Erstelle eine `.env` Datei basierend auf deinen Bedürfnissen. Da wir Docker Compose nutzen, werden die wichtigsten Variablen bereits dort gesetzt, aber für Geheimnisse (Secrets) solltest du eine eigene `.env` nutzen oder die `docker-compose.yml` anpassen (aber **ACHTUNG**: Passwörter nicht ins Git pushen!).

Für den Start reicht die Standard-Konfiguration im `docker-compose.yml` oft aus, aber du solltest **dringend** `NEXTAUTH_SECRET` und Passwörter ändern.

Öffne `docker-compose.yml` und passe ggf. die Umgebungsvariablen an:

```yaml
    environment:
      - DATABASE_URL=file:/app/db/prod.db
      - NEXTAUTH_URL=http://deine-domain.de  # <-- WICHTIG: Hier deine Domain oder IP eintragen
      - NEXTAUTH_SECRET=ein_sehr_langes_und_sicheres_zufallspasswort # <-- ÄNDERN!
      # Optional (SEO): Basis-URL für Canonical, OpenGraph, robots.txt und sitemap.xml (Fallback: NEXTAUTH_URL)
      - SITE_URL=http://deine-domain.de
```

Oder besser: Erstelle eine `.env.production` Datei und lade sie in Docker.

## 3. Ordner für persistente Daten vorbereiten

Damit Bilder und die Datenbank nicht verloren gehen, wenn der Container neu gestartet wird, erstellen wir die Ordner auf dem Host:

```bash
mkdir -p db
mkdir -p public/uploads

# Rechte anpassen, damit der Container (User 1001) schreiben darf
# Option A (Sicher):
sudo chown -R 1001:1001 db public/uploads

# Option B (Einfach):
chmod -R 777 db public/uploads
```

## 4. Starten

Starte die Anwendung im Hintergrund:

```bash
docker compose up -d --build
```

Der erste Start dauert etwas, da das Docker-Image gebaut wird.

## 5. Updates einspielen

Wenn du Änderungen am Code vorgenommen und auf GitHub gepusht hast:

```bash
# 1. Neuesten Code holen
git pull

# 2. Neu bauen und starten (nur geänderte Container werden neu erstellt)
docker compose up -d --build
```

## 6. (Optional) Nginx Proxy & SSL

Es wird empfohlen, einen Nginx als Reverse Proxy davor zu schalten, um SSL (HTTPS) via Let's Encrypt zu nutzen.

Beispiel Nginx Config (`/etc/nginx/sites-available/tribefinder`):

```nginx
server {
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Dann Certbot nutzen: `sudo certbot --nginx -d deine-domain.de`

## Empfohlener Workflow: Erst Staging testen, dann Prod updaten

Ziel: Änderungen erst in einer **Staging-Instanz** testen (mit echten Daten via Backup), und erst nach erfolgreichem Test in **Prod** einspielen.

### Begriffe

- **Prod**: echte Instanz (z.B. `tribefinder.de`)
- **Staging**: Test-Instanz (z.B. `staging.tribefinder.de`) mit eigener DB + eigenen Uploads

Hinweis (SEO): Für Staging/Test empfiehlt sich zusätzlich im Reverse Proxy:
- `X-Robots-Tag: noindex, nofollow, noarchive`

### 1) Backup in Prod erstellen

Im Admin-Bereich:

- Öffne `/admin/backups`
- Klicke **Backup erstellen**
- Optional: Backup über **Download** herunterladen

Das Backup enthält:

- Datenbank:
  - SQLite: `db.sqlite` (Pfad aus `DATABASE_URL`)
  - PostgreSQL: `db.sql` (erstellt via `pg_dump`)
- `public/uploads`

### 2) Backup nach Staging bringen

Optionen:

- **Download/Upload** (einfach, bei größeren Backups ggf. langsam)
- **Server-seitig kopieren** (z.B. per SCP/rsync), wenn Staging auf einem anderen Host läuft

### 3) Restore in Staging durchführen

Variante A: über UI (wenn Staging läuft)

- Öffne `/admin/backups` auf Staging
- **Restore entsperren (10 Minuten)** (Admin-Passwort)
- Backup auswählen
- `RESTORE` eintippen
- **Restore starten**

Variante B: Notfall-Script (wenn App nicht startet)

1. Service manuell stoppen
2. Restore:

```bash
chmod +x scripts/restore-backup.sh
./scripts/restore-backup.sh backups/<backup>.tar.gz
```

Hinweise:

- Bei **PostgreSQL** stellt das Script den Dump über `psql` wieder her und setzt vorher das `public` Schema zurück
  (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`). Das ist **destruktiv**.
- Voraussetzung für PostgreSQL Backup/Restore: `pg_dump` und `psql` müssen installiert sein.

3. Service manuell starten

### 4) Self-Test / Diagnose auf Staging ausführen

Im Admin-Bereich:

- Öffne `/admin/diagnostics`
- Klicke **Diagnose starten**

Die Diagnose prüft u.a.:

- ENV/Config vorhanden
- DB erreichbar + Migrationen
- Uploads (write/read)
- CRUD Smoke-Tests (Gruppe/Tag/DanceStyle) mit Cleanup

### 5) Erst danach: Prod deployen

Wenn Staging ok ist:

- Update/Deploy in Prod ausführen
- Danach in Prod einmal `/admin/diagnostics` laufen lassen
