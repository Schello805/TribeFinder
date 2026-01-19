# TribeFinder - Docker Installation (Optional)

Diese Anleitung beschreibt die Installation von TribeFinder mit Docker.

**Hinweis:** Für die meisten Anwendungsfälle (besonders Ubuntu LXC) empfehlen wir die **native Installation** (siehe `INSTALL_NATIVE.md`). Docker ist sinnvoll für:
- Multi-Service-Setups mit mehreren Containern
- Isolierte Entwicklungsumgebungen
- Wenn du bereits Docker-Infrastruktur nutzt

## Voraussetzungen

- Docker Engine 20.10+
- Docker Compose Plugin v2+
- Mindestens 2 GB RAM
- 10 GB freier Speicherplatz

## Installation

### 1. Docker installieren (Ubuntu/Debian)

```bash
# Docker Repository hinzufügen
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker installieren
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Starten und aktivieren
sudo systemctl enable --now docker

# Version prüfen
docker --version
docker compose version
```

**Alternative** (falls Docker APT Repo fehlschlägt):
```bash
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```

**Optional** (Docker ohne sudo):
```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

### 2. TribeFinder mit Docker starten

```bash
# Repository klonen
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder

# Persistente Ordner anlegen
mkdir -p db public/uploads

# Rechte setzen (Container läuft als User 1001)
sudo chown -R 1001:1001 db public/uploads

# docker-compose.yml anpassen
nano docker-compose.yml
# Setze mindestens:
# - NEXTAUTH_URL (deine Domain)
# - NEXTAUTH_SECRET (generiere mit: openssl rand -base64 32)

# Container starten
docker compose up -d --build

# Logs prüfen
docker compose logs -f
```

### 3. Updates einspielen

```bash
# Mit dem mitgelieferten Script (empfohlen)
chmod +x scripts/update.sh
./scripts/update.sh

# Oder manuell:
git pull
docker compose down
docker compose up -d --build
```

## Konfiguration

### docker-compose.yml

Die wichtigsten Umgebungsvariablen:

```yaml
environment:
  - DATABASE_URL=postgresql://tribefinder:${POSTGRES_PASSWORD}@postgres:5432/tribefinder?schema=public
  - NEXTAUTH_SECRET=dein-geheimes-secret
  - NEXTAUTH_URL=https://deine-domain.de
  - NODE_ENV=production
```

### PostgreSQL

Docker nutzt standardmäßig PostgreSQL statt SQLite:
- **Datenbank**: `tribefinder`
- **User**: `tribefinder`
- **Port**: 5432 (nur intern im Docker-Netzwerk)
- **Passwort**: Setze `POSTGRES_PASSWORD` in docker-compose.yml

### Volumes

Persistente Daten werden in folgenden Verzeichnissen gespeichert:
- `./db`: PostgreSQL Datenbank
- `./public/uploads`: Hochgeladene Bilder

## Reverse Proxy (Nginx/Traefik)

### Nginx Beispiel

```nginx
server {
    listen 80;
    server_name deine-domain.de;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    client_max_body_size 10M;
}
```

### SSL mit Let's Encrypt

```bash
sudo certbot --nginx -d deine-domain.de
```

## Wartung

### Container-Status prüfen
```bash
docker compose ps
```

### Logs anzeigen
```bash
# Alle Services
docker compose logs -f

# Nur TribeFinder
docker compose logs -f tribefinder

# Nur PostgreSQL
docker compose logs -f postgres
```

### Container neustarten
```bash
docker compose restart
```

### Container stoppen
```bash
docker compose down
```

### Datenbank-Backup
```bash
# PostgreSQL Dump
docker compose exec postgres pg_dump -U tribefinder tribefinder > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U tribefinder tribefinder < backup_20260119.sql
```

### In Container einsteigen
```bash
# TribeFinder Container
docker compose exec tribefinder sh

# PostgreSQL Container
docker compose exec postgres psql -U tribefinder tribefinder
```

## Troubleshooting

### Port 3000 bereits belegt
```bash
# In docker-compose.yml ändern:
ports:
  - "3001:3000"  # Externer Port 3001
```

### Container startet nicht
```bash
# Logs prüfen
docker compose logs tribefinder

# Container neu bauen
docker compose down
docker compose up -d --build --force-recreate
```

### Datenbank-Verbindungsfehler
```bash
# Prüfe ob PostgreSQL läuft
docker compose ps postgres

# PostgreSQL Logs
docker compose logs postgres

# Verbindung testen
docker compose exec tribefinder npx prisma migrate status
```

### Upload-Fehler
```bash
# Rechte prüfen
ls -la public/uploads

# Rechte setzen
sudo chown -R 1001:1001 public/uploads
```

## Migration von Docker zu Native

Falls du von Docker auf native Installation wechseln möchtest:

1. **Datenbank exportieren:**
   ```bash
   docker compose exec postgres pg_dump -U tribefinder tribefinder > export.sql
   ```

2. **Native Installation durchführen** (siehe `INSTALL_NATIVE.md`)

3. **Daten importieren:**
   ```bash
   # Wenn du PostgreSQL nativ nutzt:
   psql -U tribefinder tribefinder < export.sql
   
   # Wenn du SQLite nutzt:
   # Nutze Prisma Studio oder ein Migrations-Script
   ```

4. **Uploads kopieren:**
   ```bash
   cp -r public/uploads /home/tribefinder/TribeFinder/public/
   ```

## Ressourcen-Limits (optional)

In `docker-compose.yml` kannst du Ressourcen-Limits setzen:

```yaml
services:
  tribefinder:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Weitere Informationen

- **Native Installation:** `INSTALL_NATIVE.md`
- **Deployment-Details:** `DEPLOY.md`
- **Optimierungen:** `OPTIMIZATIONS.md`
