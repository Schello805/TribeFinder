# TribeFinder - Manuelle Installation (Ubuntu 24.04)

Diese Anleitung führt dich Schritt für Schritt durch die Installation.

## Voraussetzungen

- Ubuntu 24.04 LXC Container
- Root-Zugriff
- Node.js 20.x bereits installiert

## Installation

### 1. Als tribefinder User arbeiten

```bash
# Wechsle zum tribefinder User
sudo su - tribefinder
cd ~
```

### 2. Repository klonen

```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
```

### 3. .env Datei erstellen

```bash
cat > .env << 'EOF'
# Database
DATABASE_URL="file:./prod.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="CHANGE_THIS_TO_RANDOM_STRING"

# Optional: SMTP
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=
EOF

# Generiere ein sicheres Secret
SECRET=$(openssl rand -base64 32)
sed -i "s|CHANGE_THIS_TO_RANDOM_STRING|$SECRET|" .env
```

### 4. Dependencies installieren

```bash
npm install
```

### 5. Tailwind CSS Fix (falls Build-Fehler)

```bash
rm -rf node_modules package-lock.json
npm install
```

### 6. Datenbank initialisieren

```bash
npm run db:generate
npm run db:migrate
```

### 7. Production Build erstellen

```bash
npm run build
```

### 8. Upload-Verzeichnis erstellen

```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### 9. Test-Start

```bash
npm start
```

Die App sollte jetzt auf `http://localhost:3000` laufen.
Drücke `Ctrl+C` um zu stoppen.

---

## Systemd Service einrichten (als root)

```bash
# Zurück zu root
exit

# Service-Datei erstellen
sudo tee /etc/systemd/system/tribefinder.service > /dev/null << 'EOF'
[Unit]
Description=TribeFinder Next.js Application
After=network.target

[Service]
Type=simple
User=tribefinder
WorkingDirectory=/home/tribefinder/TribeFinder
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable tribefinder
sudo systemctl start tribefinder
sudo systemctl status tribefinder
```

---

## Nginx Reverse Proxy (optional)

### Für localhost (nur lokal erreichbar)

Die App läuft bereits auf Port 3000. Kein Nginx nötig.

### Für Domain mit SSL

```bash
# Nginx Config erstellen
sudo tee /etc/nginx/sites-available/tribefinder > /dev/null << 'EOF'
server {
    listen 80;
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Domain anpassen
sudo sed -i 's|deine-domain.de|DEINE_DOMAIN_HIER|g' /etc/nginx/sites-available/tribefinder

# Aktivieren
sudo ln -sf /etc/nginx/sites-available/tribefinder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL mit Let's Encrypt
sudo certbot --nginx -d DEINE_DOMAIN_HIER
```

**Wichtig:** NEXTAUTH_URL in `.env` anpassen:
```bash
sudo su - tribefinder
cd ~/TribeFinder
nano .env
# Ändere NEXTAUTH_URL auf https://deine-domain.de
```

Dann Service neustarten:
```bash
exit
sudo systemctl restart tribefinder
```

---

## Admin-Account erstellen

```bash
sudo su - tribefinder
cd ~/TribeFinder
npm run db:studio
```

Öffne `http://localhost:5555` und:
1. Gehe zu `User` Tabelle
2. Finde deinen Account
3. Ändere `role` von `USER` zu `ADMIN`
4. Speichern

---

## Logs anschauen

```bash
# Service-Logs
sudo journalctl -u tribefinder -f

# Nginx-Logs
sudo tail -f /var/log/nginx/error.log
```

---

## Updates einspielen

```bash
sudo su - tribefinder
cd ~/TribeFinder
git pull
npm install
npm run db:migrate
npm run build
exit
sudo systemctl restart tribefinder
```

---

## Troubleshooting

### Build-Fehler: "Cannot find native binding"
```bash
cd /home/tribefinder/TribeFinder
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Prisma-Fehler: "path argument must be of type string"
```bash
# Prüfe .env Datei
cat .env | grep DATABASE_URL
# Sollte sein: DATABASE_URL="file:./prod.db"

# Falls falsch, korrigiere:
echo 'DATABASE_URL="file:./prod.db"' >> .env
```

### Service startet nicht
```bash
sudo journalctl -u tribefinder -n 50
```

---

**Fertig!** 🎉

Die App läuft jetzt als systemd Service und startet automatisch beim Reboot.
