# TribeFinder - Troubleshooting Guide

Häufige Probleme und deren Lösungen.

## Prisma Version-Konflikt

### Problem
```
Error: The datasource property `url` is no longer supported in schema files
Prisma CLI Version : 7.2.0
```

### Ursache
`npx prisma` installiert automatisch die neueste Prisma-Version (7.x), aber das Projekt nutzt Prisma 5.10.2.

### Lösung
**Nutze immer die npm scripts statt `npx prisma`:**

```bash
# ❌ FALSCH
npx prisma generate
npx prisma migrate deploy

# ✅ RICHTIG
npm run db:generate
npm run db:migrate
```

**Verfügbare npm scripts:**
- `npm run db:generate` - Prisma Client generieren
- `npm run db:migrate` - Migrationen ausführen (Production)
- `npm run db:migrate:dev` - Migrationen erstellen (Development)
- `npm run db:status` - Migrations-Status prüfen
- `npm run db:studio` - Prisma Studio öffnen
- `npm run db:push` - Schema direkt pushen (Development)

### Falls bereits Prisma 7 installiert wurde
```bash
# Globales Prisma entfernen
npm uninstall -g prisma

# node_modules löschen und neu installieren
rm -rf node_modules package-lock.json
npm install
```

---

## Service startet nicht

### Problem
```bash
sudo systemctl status tribefinder
# Status: failed
```

### Diagnose
```bash
# Detaillierte Logs anzeigen
sudo journalctl -u tribefinder -n 100 --no-pager

# Manuell testen
sudo su - tribefinder
cd ~/TribeFinder
npm run start
```

### Häufige Ursachen

#### 1. Port 3000 bereits belegt
```bash
# Prüfen was auf Port 3000 läuft
sudo lsof -i :3000

# Prozess beenden
sudo kill -9 <PID>

# Service neustarten
sudo systemctl restart tribefinder
```

#### 2. .env Datei fehlt oder fehlerhaft
```bash
sudo su - tribefinder
cd ~/TribeFinder
cat .env

# Prüfe ob NEXTAUTH_SECRET und DATABASE_URL gesetzt sind
```

#### 3. Datenbank nicht initialisiert
```bash
sudo su - tribefinder
cd ~/TribeFinder
npm run db:status
npm run db:migrate
```

#### 4. Build fehlt
```bash
sudo su - tribefinder
cd ~/TribeFinder
npm run build
```

---

## Nginx 502 Bad Gateway

### Problem
Website zeigt "502 Bad Gateway"

### Diagnose
```bash
# Prüfe ob TribeFinder läuft
sudo systemctl status tribefinder

# Nginx Logs
sudo tail -f /var/log/nginx/error.log

# TribeFinder Logs
sudo journalctl -u tribefinder -f
```

### Lösungen

#### TribeFinder läuft nicht
```bash
sudo systemctl start tribefinder
```

#### Nginx kann nicht zu localhost:3000 verbinden
```bash
# Prüfe ob Port 3000 offen ist
curl http://localhost:3000

# Nginx Config testen
sudo nginx -t

# Nginx neustarten
sudo systemctl restart nginx
```

---

## Datenbank-Probleme

### Migration schlägt fehl

```bash
# Status prüfen
npm run db:status

# Bei Konflikten: Migrations-Ordner prüfen
ls -la prisma/migrations/

# Letzte Migration zurückrollen (Vorsicht!)
# Backup erstellen!
npm run db:backup

# Dann manuell in der DB:
npm run db:studio
# Lösche Einträge in _prisma_migrations Tabelle
```

### SQLite Datenbank korrupt

```bash
# Backup wiederherstellen
cd ~/TribeFinder
ls -la backups/

# Neuestes Backup entpacken
gunzip -c backups/backup_YYYYMMDD_HHMMSS.db.gz > prod.db

# Service neustarten
sudo systemctl restart tribefinder
```

### PostgreSQL Verbindungsfehler

```bash
# PostgreSQL Status
sudo systemctl status postgresql

# Verbindung testen
psql -U tribefinder -h localhost tribefinder

# Passwort in .env prüfen
cat .env | grep DATABASE_URL
```

---

## Upload-Probleme

### Bilder können nicht hochgeladen werden

#### Rechte prüfen
```bash
ls -la /home/tribefinder/TribeFinder/public/uploads

# Sollte sein:
# drwxr-xr-x tribefinder tribefinder
```

#### Rechte korrigieren
```bash
sudo chown -R tribefinder:tribefinder /home/tribefinder/TribeFinder/public/uploads
chmod 755 /home/tribefinder/TribeFinder/public/uploads
```

#### Upload-Limit in Nginx
```bash
sudo nano /etc/nginx/sites-available/tribefinder

# Prüfe:
client_max_body_size 10M;

# Nginx neustarten
sudo systemctl restart nginx
```

---

## SSL/HTTPS Probleme

### Certbot schlägt fehl

```bash
# Prüfe ob Port 80 offen ist
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# DNS prüfen
nslookup deine-domain.de

# Certbot erneut versuchen
sudo certbot --nginx -d deine-domain.de
```

### Zertifikat abgelaufen

```bash
# Manuell erneuern
sudo certbot renew

# Auto-Renewal testen
sudo certbot renew --dry-run
```

---

## Performance-Probleme

### Hoher RAM-Verbrauch

```bash
# Memory Limit in systemd setzen
sudo nano /etc/systemd/system/tribefinder.service

# Füge hinzu:
Environment=NODE_OPTIONS="--max-old-space-size=512"

# Reload und restart
sudo systemctl daemon-reload
sudo systemctl restart tribefinder
```

### Langsame Ladezeiten

```bash
# Build-Cache löschen
sudo su - tribefinder
cd ~/TribeFinder
rm -rf .next
npm run build

# Service neustarten
sudo systemctl restart tribefinder
```

---

## Node.js Version-Probleme

### Falsche Node.js Version

```bash
# Version prüfen
node -v

# Sollte v20.x.x sein
# Falls nicht:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## npm install schlägt fehl

### EACCES Fehler

```bash
# Als tribefinder User ausführen
sudo su - tribefinder
cd ~/TribeFinder
npm install
```

### Netzwerk-Timeout

```bash
# npm Registry prüfen
npm config get registry

# Timeout erhöhen
npm config set fetch-timeout 60000
npm install
```

---

## Logs & Debugging

### Alle relevanten Logs anzeigen

```bash
# TribeFinder Service Logs
sudo journalctl -u tribefinder -f

# Nginx Access Logs
sudo tail -f /var/log/nginx/tribefinder_access.log

# Nginx Error Logs
sudo tail -f /var/log/nginx/tribefinder_error.log

# System Logs
sudo journalctl -xe
```

### Debug-Modus aktivieren

```bash
sudo su - tribefinder
cd ~/TribeFinder
nano .env

# Füge hinzu:
NODE_ENV=development
DEBUG=*

# Service neustarten
sudo systemctl restart tribefinder
```

---

## Kompletter Neustart

Falls nichts hilft:

```bash
# 1. Backup erstellen
sudo su - tribefinder
cd ~/TribeFinder
npm run db:backup
cp -r public/uploads ~/uploads_backup
cp .env ~/.env.backup

# 2. Service stoppen
sudo systemctl stop tribefinder

# 3. Alles neu bauen
rm -rf node_modules .next
npm install
npm run build

# 4. Datenbank neu initialisieren
npm run db:generate
npm run db:migrate

# 5. Service starten
sudo systemctl start tribefinder

# 6. Status prüfen
sudo systemctl status tribefinder
sudo journalctl -u tribefinder -f
```

---

## Weitere Hilfe

- **GitHub Issues:** https://github.com/Schello805/TribeFinder/issues
- **Dokumentation:** `README.md`, `INSTALL_NATIVE.md`
- **Community:** Erstelle ein Issue mit detaillierten Logs
