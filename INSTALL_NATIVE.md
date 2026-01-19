# TribeFinder - Native Ubuntu LXC Installation

Diese Anleitung beschreibt die Installation von TribeFinder **ohne Docker** direkt auf einem Ubuntu LXC Container.

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
sudo apt install -y git curl ca-certificates openssl nginx certbot python3-certbot-nginx
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
# SQLite für einfache Installation
DATABASE_URL="file:./prod.db"

# NextAuth Konfiguration
NEXTAUTH_SECRET="GENERIERE_EIN_LANGES_ZUFÄLLIGES_SECRET_HIER"
NEXTAUTH_URL="https://deine-domain.de"

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
npm install
```

### Datenbank initialisieren
```bash
npm run db:generate
npm run db:migrate
```

### Production Build erstellen
```bash
npm run build
```

### Upload-Verzeichnis vorbereiten
```bash
mkdir -p public/uploads
chmod 755 public/uploads
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

### Status prüfen
```bash
sudo systemctl status tribefinder
```

### Logs anschauen
```bash
sudo journalctl -u tribefinder -f
```

## 6. Nginx als Reverse Proxy einrichten

### Nginx Konfiguration erstellen
```bash
sudo nano /etc/nginx/sites-available/tribefinder
```

Inhalt (siehe `config/nginx.conf` im Repo):
```nginx
server {
    listen 80;
    server_name deine-domain.de;

    # Weiterleitung zu HTTPS (wird nach SSL-Setup aktiv)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts für große Uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Upload-Limit
    client_max_body_size 10M;
}
```

### Konfiguration aktivieren
```bash
sudo ln -s /etc/nginx/sites-available/tribefinder /etc/nginx/sites-enabled/
sudo nginx -t  # Konfiguration testen
sudo systemctl restart nginx
```

## 7. SSL-Zertifikat mit Let's Encrypt (optional, aber empfohlen)

### Certbot ausführen
```bash
sudo certbot --nginx -d deine-domain.de
```

Folge den Anweisungen. Certbot konfiguriert automatisch HTTPS und Redirects.

### Auto-Renewal testen
```bash
sudo certbot renew --dry-run
```

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
```bash
sudo su - tribefinder
cd ~/TribeFinder

# Backup erstellen
npm run db:backup

# Updates holen
git pull

# Dependencies aktualisieren
npm install

# Migrationen ausführen
npx prisma migrate deploy

# Neu bauen
npm run build

# Service neustarten
exit
sudo systemctl restart tribefinder
```

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

### Nginx 502 Bad Gateway
```bash
# Prüfen ob TribeFinder läuft
sudo systemctl status tribefinder

# Nginx Logs prüfen
sudo tail -f /var/log/nginx/error.log
```

### Datenbank-Probleme
```bash
# Datenbank-Status prüfen
sudo su - tribefinder
cd ~/TribeFinder
npm run db:status

# Migrationen neu ausführen
npm run db:migrate
```

### Upload-Fehler
```bash
# Rechte prüfen
ls -la /home/tribefinder/TribeFinder/public/uploads

# Rechte setzen
sudo chown -R tribefinder:tribefinder /home/tribefinder/TribeFinder/public/uploads
chmod 755 /home/tribefinder/TribeFinder/public/uploads
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
- [ ] SSL/HTTPS ist aktiviert
- [ ] Firewall ist konfiguriert
- [ ] Regelmäßige Backups sind eingerichtet
- [ ] System-Updates werden regelmäßig eingespielt
- [ ] Nginx Upload-Limit ist gesetzt
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
