# TribeFinder - Native Ubuntu LXC Installation

Diese Anleitung beschreibt die Installation von TribeFinder direkt auf einem Ubuntu LXC Container.

## TL;DR (empfohlen: vollautomatisch)

Die empfohlene Installation ist komplett automatisiert über das Setup-Script:

```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
sudo ./scripts/setup-native.sh
```

Das Script übernimmt:

- Installation von System-Paketen und Node.js
- Erstellen/Verifizieren des Users `tribefinder`
- Klonen nach `/home/tribefinder/TribeFinder` inkl. korrekter Ownership (kein Git "dubious ownership")
- `.env` Erstellung (inkl. `NEXTAUTH_SECRET`)
- Reproduzierbare Dependency-Installation (`npm ci --include=optional`)
- Prisma generate + db push
- Production Build
- Uploads unter `/var/www/tribefinder/uploads`
- systemd Service

## Voraussetzungen

- Ubuntu 22.04 oder 24.04 LXC Container
- Root- oder sudo-Zugriff
- Mindestens 1 GB RAM
- 5 GB freier Speicherplatz

## 1. System vorbereiten

### Pakete aktualisieren
```bash
sudo apt update && sudo apt upgrade -y
```

### Benötigte System-Pakete installieren
```bash
sudo apt install -y git curl ca-certificates openssl acl
```

## 2. Node.js installieren

### Node.js 20.x via NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Version prüfen
```bash
node -v   # sollte v20.x.x zeigen
npm -v    # sollte 10.x.x zeigen
```

## 3. Benutzer für TribeFinder erstellen

Aus Sicherheitsgründen sollte die App nicht als root laufen:

```bash
sudo useradd -r -m -s /bin/bash tribefinder
sudo usermod -aG sudo tribefinder  # optional, falls sudo benötigt wird
```

## 4. TribeFinder installieren

Hinweis: Die folgenden Schritte sind eine **manuelle Alternative**. Wenn möglich, nutze stattdessen `./scripts/setup-native.sh` (siehe oben).

### Als tribefinder-User wechseln
```bash
sudo su - tribefinder
```

### Repository klonen
```bash
cd ~
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
```

### Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
nano .env
```

Wichtige Einstellungen in `.env`:
```env
# PostgreSQL
DATABASE_URL="postgresql://tribefinder:password@localhost:5432/tribefinder?schema=public"

# NextAuth Konfiguration
NEXTAUTH_SECRET="GENERIERE_EIN_LANGES_ZUFÄLLIGES_SECRET_HIER"
NEXTAUTH_URL="http://localhost:3000"

# SMTP (optional, kann später im Admin-Bereich konfiguriert werden)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

**WICHTIG:** Generiere ein sicheres Secret:
```bash
openssl rand -base64 32
```

### Dependencies installieren
```bash
npm ci --include=optional
```

### Datenbank initialisieren
```bash
npm run db:generate
npm run db:push
```

### Production Build erstellen
```bash
npm run build
```

### Upload-Verzeichnis vorbereiten (empfohlen)
```bash
sudo mkdir -p /var/www/tribefinder/uploads
sudo chown -R tribefinder:tribefinder /var/www/tribefinder/uploads
sudo chmod 755 /var/www/tribefinder/uploads

# App schreibt weiterhin nach public/uploads (Symlink auf /var/www/...)
sudo rm -rf public/uploads
sudo ln -s /var/www/tribefinder/uploads public/uploads
```

### Test-Start (optional)
```bash
npm run start
```
Drücke `Ctrl+C` zum Beenden, wenn alles funktioniert.

### Zurück zu deinem normalen User
```bash
exit
```

## 5. Systemd Service einrichten

### Service-Datei erstellen
```bash
sudo nano /etc/systemd/system/tribefinder.service
```

Inhalt (siehe `config/tribefinder.service` im Repo):
```ini
[Unit]
Description=TribeFinder - Tribal Dance Community Platform
After=network.target

[Service]
Type=simple
User=tribefinder
Group=tribefinder
WorkingDirectory=/home/tribefinder/TribeFinder
Environment=NODE_ENV=production
EnvironmentFile=/home/tribefinder/TribeFinder/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tribefinder

[Install]
WantedBy=multi-user.target
```

### Service aktivieren und starten
```bash
sudo systemctl daemon-reload
sudo systemctl enable tribefinder
sudo systemctl start tribefinder
```

Empfohlen:
```bash
sudo chmod 600 /home/tribefinder/TribeFinder/.env
sudo chown tribefinder:tribefinder /home/tribefinder/TribeFinder/.env
```

### Status prüfen
```bash
sudo systemctl status tribefinder
```

### Logs anschauen
```bash
sudo journalctl -u tribefinder -f
```

## Reverse Proxy / HTTPS

TribeFinder läuft lokal/serverseitig auf `http://localhost:3000`.

Wenn du HTTPS oder einen Reverse Proxy brauchst, setze das **extern** um (beliebiger Reverse Proxy). Das ist bewusst nicht Teil dieses Repos.

## 8. Ersten Admin-User erstellen

### Registriere dich über die Web-Oberfläche
Öffne `https://deine-domain.de` und registriere einen Account.

### Zum Admin befördern
```bash
sudo su - tribefinder
cd ~/TribeFinder
npm run db:studio
```

Oder via Script:
```bash
node make-admin.js deine@email.de
```

## 9. Wartung & Updates

### Updates einspielen

Empfohlen: Nutze das Update/Deploy-Script.

```bash
sudo su - tribefinder
cd ~/TribeFinder
./scripts/deploy-native.sh
```

Das Script führt je nach Stand automatisch u.a. aus:

- `git pull`
- `npm ci --include=optional`
- `npm run db:generate` / `npm run db:push`
- `npm run build`
- `sudo systemctl restart tribefinder`

### Logs überwachen
```bash
# Live-Logs
sudo journalctl -u tribefinder -f

# Letzte 100 Zeilen
sudo journalctl -u tribefinder -n 100

# Logs seit heute
sudo journalctl -u tribefinder --since today
```

### Datenbank-Backups
```bash
# Manuelles Backup
sudo su - tribefinder
cd ~/TribeFinder
npm run db:backup
```

### Automatische Backups via Cron
```bash
sudo crontab -e -u tribefinder
```

Füge hinzu (täglich um 2 Uhr nachts):
```cron
0 2 * * * cd /home/tribefinder/TribeFinder && npm run db:backup
```

Alternativ (empfohlen): automatische Server-Backups via systemd Timer.
Das Intervall kann im Admin-Bereich unter **Admin → Backups** als `BACKUP_INTERVAL_HOURS` eingestellt werden.

Timer aktivieren:
```bash
sudo systemctl enable tribefinder-auto-backup.timer
sudo systemctl start tribefinder-auto-backup.timer
sudo systemctl list-timers | grep tribefinder-auto-backup
```

## 10. Firewall (optional, aber empfohlen)

### UFW installieren und konfigurieren
```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

## Troubleshooting

### Service startet nicht
```bash
# Logs prüfen
sudo journalctl -u tribefinder -n 50

# Manuell testen
sudo su - tribefinder
cd ~/TribeFinder
npm run start
```

### Port 3000 bereits belegt
```bash
# Prüfen, was auf Port 3000 läuft
sudo lsof -i :3000

# Prozess beenden (falls nötig)
sudo kill -9 <PID>
```

### Reverse Proxy Fehler
Wenn du einen externen Reverse Proxy verwendest: prüfe zuerst, ob TribeFinder auf `http://localhost:3000` erreichbar ist.

### Datenbank-Probleme
```bash
# DB Verbindung testen
psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -c "SELECT 1;"

# Schema synchronisieren
npm run db:push
```

### Upload-Fehler
```bash
# Rechte prüfen
ls -la /var/www/tribefinder/uploads

# Rechte setzen
sudo chown -R tribefinder:tribefinder /var/www/tribefinder/uploads
sudo find /var/www/tribefinder/uploads -type d -exec chmod 755 {} \;
sudo find /var/www/tribefinder/uploads -type f -exec chmod 644 {} \;
```

### E2E Tests (Playwright) schlagen fehl (Browser fehlt)
Wenn `npm run e2e` meldet, dass Chromium fehlt:
```bash
npx playwright install
```

## Performance-Tipps

### Node.js Memory Limit erhöhen (bei vielen Nutzern)
In `/etc/systemd/system/tribefinder.service`:
```ini
Environment=NODE_OPTIONS="--max-old-space-size=2048"
```

### PM2 als Alternative zu systemd (optional)
```bash
sudo npm install -g pm2
pm2 start npm --name tribefinder -- start
pm2 startup
pm2 save
```

## Sicherheits-Checkliste

- [ ] `.env` Datei ist nicht öffentlich zugänglich
- [ ] NEXTAUTH_SECRET ist ein starkes, zufälliges Secret
- [ ] SSL/HTTPS ist extern (Reverse Proxy) aktiviert (optional)
- [ ] Firewall ist konfiguriert
- [ ] Regelmäßige Backups sind eingerichtet
- [ ] System-Updates werden regelmäßig eingespielt
- [ ] Service läuft nicht als root

## Ressourcen-Anforderungen

**Minimum:**
- 1 GB RAM
- 1 CPU Core
- 5 GB Speicher

**Empfohlen:**
- 2 GB RAM
- 2 CPU Cores
- 10 GB Speicher

## Support

Bei Problemen:
1. Logs prüfen: `sudo journalctl -u tribefinder -f`
2. GitHub Issues: https://github.com/Schello805/TribeFinder/issues
3. Dokumentation: `README.md` und `OPTIMIZATIONS.md`
