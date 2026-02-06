# Deployment (native)

Diese Anleitung beschreibt das Deployment von TribeFinder. Die App läuft serverseitig als systemd Service auf **HTTP Port 3000**.

Reverse Proxy / HTTPS ist bewusst **nicht Teil dieses Projekts** und kann extern nach Wahl umgesetzt werden.

## Voraussetzungen

- Git
- Node.js 20+
- PostgreSQL (lokal oder extern erreichbar)

## Installation

Für die Erstinstallation nutze bitte:

- `INSTALL_NATIVE.md` (empfohlen)

## Updates / Deploy

Auf dem Server als `tribefinder`:

```bash
cd ~/TribeFinder
./scripts/deploy-native.sh
```

Das Script führt u.a. aus:

- `git pull`
- `npm ci --include=optional`
- Prisma generate + migrate
- `npm run typecheck`
- `npm run build`
- Restart des systemd Service

Zusätzlich aktualisiert das Script systemd Timer:

- `tribefinder-auto-backup.timer` (automatische Backups)
- `tribefinder-marketplace-expiry.timer` (Marketplace: Reminder + Auto-Löschung abgelaufener Inserate)

## Wartungsmodus (Maintenance Mode)

Wenn du während Wartungsarbeiten Schreibzugriffe blockieren willst, kannst du in der `.env` setzen:

```env
MAINTENANCE_MODE=1
```

Effekt:

- Schreib-Requests (POST/PUT/PATCH/DELETE) werden mit **HTTP 503** geblockt.
- GET/Navigation bleibt möglich.

Hinweis: Ab Next.js 16+ ist die Dateikonvention dafür `src/proxy.ts` (statt `middleware.ts`).

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

## Marketplace Expiry Timer (Reminder + Auto-Delete)

TribeFinder bringt einen systemd Timer mit, der Marketplace Inserate automatisch verwaltet:

- Reminder E-Mail: 4 Wochen (28 Tage) vor Ablauf
- Auto-Delete: ab Ablaufdatum (inkl. Entfernen der Upload-Dateien aus `/uploads`)

Service/Timer:

- `tribefinder-marketplace-expiry.service`
- `tribefinder-marketplace-expiry.timer`

Nützliche Befehle:

```bash
sudo systemctl status tribefinder-marketplace-expiry.service
sudo systemctl status tribefinder-marketplace-expiry.timer

sudo systemctl list-timers | grep tribefinder-marketplace-expiry

sudo journalctl -u tribefinder-marketplace-expiry.service -n 200
```

### 5) Erst danach: Prod deployen

Wenn Staging ok ist:

- Update/Deploy in Prod ausführen
- Danach in Prod einmal `/admin/diagnostics` laufen lassen
