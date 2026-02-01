# TribeFinder - Quickstart Guide

Die schnellste Methode, um TribeFinder auf einem Ubuntu LXC Container zu installieren.

## Voraussetzungen

- Ubuntu 22.04/24.04 LXC Container
- Root-Zugriff

## Installation in 3 Schritten

### 1. Repository klonen

```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
```

### 2. Automatisches Setup ausführen

```bash
sudo ./scripts/setup-native.sh
```

Es installiert automatisch:
- Node.js 20
- TribeFinder
- Systemd Service

### 3. Admin-Account erstellen

```bash
# Registriere dich über die Website
# Öffne: http://localhost:3000

# Mache dich zum Admin
sudo su - tribefinder
cd ~/TribeFinder
node make-admin.js deine@email.de
```

**Fertig!** 🎉

## Wichtige Befehle

```bash
# Status prüfen
sudo systemctl status tribefinder

# Logs anzeigen
sudo journalctl -u tribefinder -f

# Service neustarten
sudo systemctl restart tribefinder

# Updates einspielen
sudo su - tribefinder
cd ~/TribeFinder
npm run deploy
```

## Nächste Schritte

1. **SMTP konfigurieren** (für E-Mail-Versand)
   - Gehe zu `/admin` → Einstellungen
   - Trage SMTP-Daten ein

2. **Matomo einrichten** (optional, für Analytics)
   - Gehe zu `/admin` → Einstellungen
   - Trage Matomo-URL und Site-ID ein

3. **Erste Gruppe erstellen**
   - Gehe zu `/groups/create`

4. **Backup einrichten**
   ```bash
   # Automatisches Backup täglich um 2 Uhr
   sudo crontab -e -u tribefinder
   # Füge hinzu:
   0 2 * * * cd /home/tribefinder/TribeFinder && npm run db:backup
   ```

## Troubleshooting

### Service läuft nicht
```bash
sudo journalctl -u tribefinder -n 50
```

### Website nicht erreichbar
```bash
curl -i http://localhost:3000
sudo systemctl status tribefinder
sudo journalctl -u tribefinder -n 100 --no-pager
```

### Port 3000 bereits belegt
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
sudo systemctl restart tribefinder
```

## Weitere Dokumentation

- **Detaillierte Installation:** `INSTALL_NATIVE.md`
- **Optimierungen:** `OPTIMIZATIONS.md`

## Support

Bei Problemen:
- GitHub Issues: https://github.com/Schello805/TribeFinder/issues
- Logs prüfen: `sudo journalctl -u tribefinder -f`
