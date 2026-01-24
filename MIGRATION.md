# Migration: Docker → Native Installation

Diese Anleitung hilft dir beim Wechsel von Docker zu nativer Installation.

## Warum migrieren?

**Vorteile der nativen Installation:**
- Weniger Ressourcenverbrauch (RAM/CPU)
- Einfacheres Debugging
- Schnellere Entwicklung
- Direkter Zugriff auf Dateien und Logs
- Keine Docker-Abhängigkeit

## Voraussetzungen

- Ubuntu 22.04/24.04 oder Debian 12
- Root-Zugriff
- Laufende Docker-Installation von TribeFinder

## Schritt-für-Schritt Migration

### 1. Daten sichern

```bash
# Datenbank exportieren (PostgreSQL)
docker compose exec postgres pg_dump -U tribefinder tribefinder > tribefinder_backup.sql

# Uploads sichern
docker cp $(docker compose ps -q tribefinder):/app/public/uploads ./uploads_backup

# .env Datei sichern
docker compose exec tribefinder cat .env > .env.backup
```

### 2. Docker stoppen (noch nicht löschen!)

```bash
docker compose down
```

### 3. Native Installation durchführen

```bash
# Setup-Script ausführen
sudo ./scripts/setup-native.sh
```

Das Script wird:
- Node.js installieren
- tribefinder User erstellen
- TribeFinder installieren
- Systemd Service einrichten
- Nginx konfigurieren

### 4. Daten wiederherstellen

#### Option A: SQLite nutzen (empfohlen für kleine/mittlere Nutzerzahl)

```bash
# Wechsle zu tribefinder User
sudo su - tribefinder
cd ~/TribeFinder

# .env anpassen
nano .env
# Setze: DATABASE_URL="file:./prod.db"

# Datenbank neu initialisieren
npx prisma migrate deploy

# Daten manuell über Prisma Studio importieren
npx prisma studio
# Oder: Nutze ein Custom-Script zum Import
```

#### Option B: PostgreSQL nativ installieren

```bash
# PostgreSQL installieren
sudo apt install -y postgresql postgresql-contrib

# Datenbank und User erstellen
sudo -u postgres psql
CREATE DATABASE tribefinder;
CREATE USER tribefinder WITH PASSWORD 'sicheres-passwort';
GRANT ALL PRIVILEGES ON DATABASE tribefinder TO tribefinder;
\q

# Backup importieren
psql -U tribefinder tribefinder < tribefinder_backup.sql

# .env anpassen
sudo su - tribefinder
cd ~/TribeFinder
nano .env
# Setze: DATABASE_URL="postgresql://tribefinder:passwort@localhost:5432/tribefinder?schema=public"
```

#### Uploads wiederherstellen

```bash
# Als tribefinder User
sudo su - tribefinder
cd ~/TribeFinder

# Uploads Zielpfad (robust für Nginx in LXC)
sudo mkdir -p /var/www/tribefinder/uploads
sudo chown -R tribefinder:tribefinder /var/www/tribefinder/uploads
sudo chmod 755 /var/www/tribefinder/uploads

# App-Pfad als Symlink setzen
sudo rm -rf public/uploads
sudo ln -s /var/www/tribefinder/uploads public/uploads

# Uploads kopieren
cp -r /pfad/zu/uploads_backup/* /var/www/tribefinder/uploads/

# Rechte setzen
sudo find /var/www/tribefinder/uploads -type d -exec chmod 755 {} \;
sudo find /var/www/tribefinder/uploads -type f -exec chmod 644 {} \;
```

### 5. Service starten und testen

```bash
# Service starten
sudo systemctl start tribefinder

# Status prüfen
sudo systemctl status tribefinder

# Logs überwachen
sudo journalctl -u tribefinder -f

# Im Browser testen
# https://deine-domain.de
```

### 6. Docker aufräumen (optional)

Wenn alles funktioniert:

```bash
# Container und Images löschen
docker compose down -v
docker rmi tribefinder-tribefinder

# Docker komplett deinstallieren (optional)
sudo apt remove docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker
```

## Troubleshooting

### Service startet nicht

```bash
# Detaillierte Logs
sudo journalctl -u tribefinder -n 100 --no-pager

# Manuell testen
sudo su - tribefinder
cd ~/TribeFinder
npm run start
```

### Datenbank-Verbindungsfehler

```bash
# PostgreSQL Status prüfen
sudo systemctl status postgresql

# Verbindung testen
psql -U tribefinder -h localhost tribefinder

# Prisma Status
sudo su - tribefinder
cd ~/TribeFinder
npx prisma migrate status
```

### Nginx 502 Bad Gateway

```bash
# Prüfe ob TribeFinder läuft
sudo systemctl status tribefinder

# Prüfe Port 3000
sudo lsof -i :3000

# Nginx Logs
sudo tail -f /var/log/nginx/error.log
```

### Uploads funktionieren nicht

```bash
# Rechte prüfen
ls -la /var/www/tribefinder/uploads

# Rechte korrigieren
sudo chown -R tribefinder:tribefinder /var/www/tribefinder/uploads
sudo find /var/www/tribefinder/uploads -type d -exec chmod 755 {} \;
sudo find /var/www/tribefinder/uploads -type f -exec chmod 644 {} \;
```

## Rollback zu Docker

Falls Probleme auftreten:

```bash
# Native Installation stoppen
sudo systemctl stop tribefinder

# Docker wieder starten
cd /pfad/zu/TribeFinder
docker compose up -d

# Daten zurückspielen (falls nötig)
docker compose exec -T postgres psql -U tribefinder tribefinder < tribefinder_backup.sql
```

## Vergleich: Vorher/Nachher

### Docker
```bash
# Logs
docker compose logs -f

# Updates
git pull && docker compose up -d --build

# Restart
docker compose restart

# Shell
docker compose exec tribefinder sh
```

### Native
```bash
# Logs
sudo journalctl -u tribefinder -f

# Updates
sudo su - tribefinder
cd ~/TribeFinder
npm run deploy

# Restart
sudo systemctl restart tribefinder

# Shell
sudo su - tribefinder
cd ~/TribeFinder
```

## Checkliste

- [ ] Datenbank-Backup erstellt
- [ ] Uploads gesichert
- [ ] .env gesichert
- [ ] Native Installation durchgeführt
- [ ] Datenbank wiederhergestellt
- [ ] Uploads wiederhergestellt
- [ ] Service läuft
- [ ] Website im Browser erreichbar
- [ ] Login funktioniert
- [ ] Uploads funktionieren
- [ ] Admin-Bereich zugänglich
- [ ] Docker aufgeräumt

## Weitere Hilfe

- Native Installation: `INSTALL_NATIVE.md`
- Docker-Dokumentation: `DOCKER.md`
- Allgemeine Infos: `README.md`
