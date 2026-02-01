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
DATABASE_URL="postgresql://tribefinder:password@localhost:5432/tribefinder?schema=public"

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
npm ci --include=optional
```

### 5. Datenbank initialisieren

```bash
npm run db:generate
npm run db:push
```

### 6. Production Build erstellen

```bash
npm run build
```

### 7. Upload-Verzeichnis erstellen

```bash
sudo mkdir -p /var/www/tribefinder/uploads
sudo chown -R tribefinder:tribefinder /var/www/tribefinder/uploads
sudo chmod 755 /var/www/tribefinder/uploads

# App schreibt weiterhin nach public/uploads (Symlink auf /var/www/...)
sudo rm -rf public/uploads
sudo ln -s /var/www/tribefinder/uploads public/uploads
```

### 8. Test-Start

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

## Reverse Proxy / HTTPS

Die App läuft auf `http://localhost:3000`. Reverse Proxy / HTTPS ist extern nach Wahl und nicht Teil dieses Projekts.

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

# Wenn du einen externen Reverse Proxy verwendest, prüfe dessen Logs separat.
```

---

## Updates einspielen

```bash
sudo su - tribefinder
cd ~/TribeFinder
./scripts/deploy-native.sh
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
```

### Service startet nicht
```bash
sudo journalctl -u tribefinder -n 50
```

---

**Fertig!** 🎉

Die App läuft jetzt als systemd Service und startet automatisch beim Reboot.
