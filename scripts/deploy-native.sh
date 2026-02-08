#!/bin/bash
# TribeFinder - Native Deployment Script
# Für Ubuntu LXC

set -e

echo "=========================================="
echo "TribeFinder - Native Deployment"
echo "=========================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfe ob Script als tribefinder User läuft
if [ "$USER" != "tribefinder" ]; then
    echo -e "${RED}Fehler: Dieses Script muss als 'tribefinder' User ausgeführt werden!${NC}"
    echo "Wechsle mit: sudo su - tribefinder"
    exit 1
fi

CAN_SUDO=0
if command -v sudo >/dev/null 2>&1; then
    if sudo -v; then
        CAN_SUDO=1
    fi
fi

if [ "$CAN_SUDO" -eq 1 ]; then
    # Ensure service user can rename within /var/www/tribefinder during backup restore
    sudo mkdir -p /var/www/tribefinder/uploads /var/www/tribefinder/backups
    sudo chown -R tribefinder:tribefinder /var/www/tribefinder
    sudo chmod 755 /var/www/tribefinder || true
    sudo chmod 755 /var/www/tribefinder/uploads /var/www/tribefinder/backups || true
fi

# Stelle sicher dass Upload-Verzeichnis existiert (und beschreibbar ist)
APP_DIR="/var/www/tribefinder"
UPLOADS_DIR="$APP_DIR/uploads"
BACKUP_DIR="$APP_DIR/backups"

set_env_var() {
    local key="$1"
    local value="$2"
    local escaped
    escaped="${value//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    if grep -qE "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=\"${escaped}\"|" .env
    else
        echo "${key}=\"${escaped}\"" >> .env
    fi
}

if [ ! -d "$UPLOADS_DIR" ]; then
    echo -e "${RED}Fehler: Upload-Verzeichnis existiert nicht: $UPLOADS_DIR${NC}"
    echo "Bitte einmalig als root anlegen (oder setup-native.sh ausführen):"
    echo "  sudo mkdir -p $UPLOADS_DIR"
    echo "  sudo chown -R tribefinder:tribefinder $UPLOADS_DIR"
    echo "  sudo chmod 755 $UPLOADS_DIR"
    exit 1
fi

if [ ! -w "$UPLOADS_DIR" ]; then
    echo -e "${RED}Fehler: Upload-Verzeichnis ist nicht beschreibbar: $UPLOADS_DIR${NC}"
    echo "Fix als root:"
    echo "  sudo chown -R tribefinder:tribefinder $UPLOADS_DIR"
    exit 1
fi

# public/uploads als Symlink auf /var/www/...
if [ -L "public/uploads" ]; then
    :
elif [ -d "public/uploads" ]; then
    if [ "$(ls -A public/uploads 2>/dev/null | wc -l)" -gt 0 ]; then
        cp -a public/uploads/. "$UPLOADS_DIR/" || true
    fi
    rm -rf public/uploads
fi
ln -sfn "$UPLOADS_DIR" public/uploads

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
    echo -e "${RED}Fehler: package.json nicht gefunden!${NC}"
    echo "Bitte führe das Script im TribeFinder-Verzeichnis aus."
    exit 1
fi

if [ -f ".env" ]; then
    APP_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
    APP_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "")

    # Persist server paths in .env so API + scripts behave consistently
    set_env_var UPLOADS_DIR "$UPLOADS_DIR"
    set_env_var BACKUP_DIR "/var/www/tribefinder/backups"
    if ! grep -q '^MAINTENANCE_MODE=' .env; then
        set_env_var MAINTENANCE_MODE "false"
    fi

    if [ -n "$APP_VERSION" ]; then
        set_env_var NEXT_PUBLIC_APP_VERSION "$APP_VERSION"
    fi
    if [ -n "$APP_COMMIT" ]; then
        set_env_var NEXT_PUBLIC_APP_COMMIT "$APP_COMMIT"
    fi

    NEXTAUTH_URL_CURRENT="$(grep -E '^NEXTAUTH_URL=' .env | head -n 1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//')"
    if [ -n "$NEXTAUTH_URL_CURRENT" ] && echo "$NEXTAUTH_URL_CURRENT" | grep -qE '^https?://'; then
        if echo "$NEXTAUTH_URL_CURRENT" | grep -qi "localhost"; then
            echo -e "${YELLOW}Warnung: NEXTAUTH_URL zeigt auf localhost. Bitte in .env auf die öffentliche Domain setzen.${NC}"
        fi
        if echo "$NEXTAUTH_URL_CURRENT" | grep -qE '^http://'; then
            echo -e "${YELLOW}Hinweis: NEXTAUTH_URL nutzt http://. Wenn du über HTTPS (Reverse Proxy) zugreifst, setze NEXTAUTH_URL auf https://... sonst kann Login fehlschlagen.${NC}"
        fi
        if grep -q '^SITE_URL=' .env; then
            set_env_var SITE_URL "$NEXTAUTH_URL_CURRENT"
        else
            set_env_var SITE_URL "$NEXTAUTH_URL_CURRENT"
        fi
    fi

    # Auto-repair common invalid quoting from older setup scripts, e.g.
    # SMTP_FROM=""TribeFinder" <noreply@...>"
    if grep -q '^SMTP_FROM=""' .env; then
        SMTP_FROM_REPAIRED="$(grep -E '^SMTP_FROM=' .env | head -n 1 | sed -E 's/^SMTP_FROM=//; s/^"+//; s/"+$//' | sed -E 's/^"//' | sed -E 's/\\"/"/g')"
        if [ -z "$SMTP_FROM_REPAIRED" ]; then
            SMTP_FROM_REPAIRED='TribeFinder <noreply@tribefinder.de>'
        fi
        set_env_var SMTP_FROM "$SMTP_FROM_REPAIRED"
    fi
fi

# Stelle sicher, dass Postgres Client Tools verfügbar sind (für Backup/Restore)
if ! command -v psql >/dev/null 2>&1 || ! command -v pg_dump >/dev/null 2>&1; then
    echo -e "${YELLOW}Hinweis: PostgreSQL Client Tools (psql/pg_dump) fehlen. Versuche Installation...${NC}"
    if [ "$CAN_SUDO" -eq 1 ]; then
        sudo apt-get update
        sudo apt-get install -y postgresql-client
    else
        echo -e "${RED}Fehler: psql/pg_dump fehlen, aber sudo ist nicht verfügbar.${NC}"
        echo "Bitte einmalig als root installieren:"
        echo "  apt-get update && apt-get install -y postgresql-client"
        exit 1
    fi
fi

# Backup erstellen
echo -e "${YELLOW}[1/7] Erstelle Datenbank-Backup...${NC}"
npm run db:backup || echo "Backup fehlgeschlagen (möglicherweise keine DB vorhanden oder DATABASE_URL ist nicht gesetzt)"
echo ""

# Git Updates holen
echo -e "${YELLOW}[2/7] Hole Updates von GitHub...${NC}"
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Aktueller Branch: $CURRENT_BRANCH"

# Zeige verfügbare Updates
BEHIND=$(git rev-list HEAD..origin/$CURRENT_BRANCH --count)
if [ "$BEHIND" -gt 0 ]; then
    echo -e "${GREEN}$BEHIND neue Commits verfügbar${NC}"
    git log HEAD..origin/$CURRENT_BRANCH --oneline
    echo ""
    read -p "Updates einspielen? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if ! git diff --quiet -- public/sw.js 2>/dev/null; then
            echo -e "${YELLOW}Hinweis: Lokale Änderungen an public/sw.js erkannt (generiert) – setze Datei vor Update zurück...${NC}"
            git checkout -- public/sw.js || true
        fi
        git pull origin $CURRENT_BRANCH
    else
        echo "Updates übersprungen."
    fi
else
    echo -e "${GREEN}Bereits auf dem neuesten Stand!${NC}"
fi
echo ""

# Dependencies installieren
echo -e "${YELLOW}[3/7] Installiere Dependencies...${NC}"
if [ -f "package-lock.json" ]; then
    npm ci --include=optional
else
    npm install
fi
echo ""

# Prisma generieren
echo -e "${YELLOW}[4/7] Generiere Prisma Client...${NC}"
npm run db:generate
echo ""

# Migrationen ausführen
echo -e "${YELLOW}[5/7] Führe Datenbank-Migrationen aus...${NC}"
if [ "$CAN_SUDO" -eq 1 ]; then
    echo -e "${YELLOW}Stoppe Service für DB Update...${NC}"
    sudo systemctl stop tribefinder || true
    sleep 2
else
    echo -e "${RED}Fehler: Migrationen benötigen einen gestoppten Service, aber sudo ist nicht verfügbar.${NC}"
    echo "Bitte einmalig als root ausführen: systemctl stop tribefinder"
    echo "Dann dieses Script erneut starten."
    exit 1
fi

echo -e "${YELLOW}Synchronisiere DB Schema (Prisma db push)...${NC}"
bash ./scripts/db-migrate-safe.sh

echo -e "${YELLOW}Starte Service nach Migration...${NC}"
sudo systemctl start tribefinder || true
echo ""

# Default DanceStyles seeden (idempotent)
echo -e "${YELLOW}[5.1/7] Seede Default DanceStyles...${NC}"
npm run db:seed-styles || echo "Seed fehlgeschlagen (wird ggf. durch API-Fallback nachgeholt)"
echo ""

# Production Build
echo -e "${YELLOW}[6/7] Erstelle Production Build...${NC}"
npm run build

# Next.js standalone served static files live under .next/standalone/public
# Ensure uploads are reachable under /uploads/* in production
mkdir -p .next/standalone/public
rm -rf .next/standalone/public/uploads || true
ln -sfn "$UPLOADS_DIR" .next/standalone/public/uploads
chown -h tribefinder:tribefinder .next/standalone/public/uploads || true
echo ""

# Auto-Backup Timer/Service aktualisieren (falls vorhanden)
echo -e "${YELLOW}[6.1/7] Aktualisiere Auto-Backup Timer...${NC}"
if [ "$CAN_SUDO" -eq 1 ]; then
    sudo cp -f config/tribefinder.service /etc/systemd/system/tribefinder.service || true
    sudo cp -f config/tribefinder-auto-backup.service /etc/systemd/system/tribefinder-auto-backup.service || true
    sudo cp -f config/tribefinder-auto-backup.timer /etc/systemd/system/tribefinder-auto-backup.timer || true
    sudo cp -f config/tribefinder-marketplace-expiry.service /etc/systemd/system/tribefinder-marketplace-expiry.service || true
    sudo cp -f config/tribefinder-marketplace-expiry.timer /etc/systemd/system/tribefinder-marketplace-expiry.timer || true
    sudo systemctl daemon-reload || true
    sudo systemctl enable tribefinder-auto-backup.timer || true
    sudo systemctl start tribefinder-auto-backup.timer || true
    sudo systemctl enable tribefinder-marketplace-expiry.timer || true
    sudo systemctl start tribefinder-marketplace-expiry.timer || true
else
    echo -e "${YELLOW}Hinweis: Auto-Backup Timer übersprungen (User 'tribefinder' hat kein sudo).${NC}"
    echo "Einmalig als root ausführen:"
    echo "  cp -f config/tribefinder.service /etc/systemd/system/tribefinder.service"
    echo "  cp -f config/tribefinder-auto-backup.service /etc/systemd/system/tribefinder-auto-backup.service"
    echo "  cp -f config/tribefinder-auto-backup.timer /etc/systemd/system/tribefinder-auto-backup.timer"
    echo "  cp -f config/tribefinder-marketplace-expiry.service /etc/systemd/system/tribefinder-marketplace-expiry.service"
    echo "  cp -f config/tribefinder-marketplace-expiry.timer /etc/systemd/system/tribefinder-marketplace-expiry.timer"
    echo "  systemctl daemon-reload"
    echo "  systemctl enable --now tribefinder-auto-backup.timer"
    echo "  systemctl enable --now tribefinder-marketplace-expiry.timer"
fi
echo ""

# Service neustarten
echo -e "${YELLOW}[7/7] Starte Service neu...${NC}"
if [ "$CAN_SUDO" -eq 1 ]; then
    sudo systemctl restart tribefinder
else
    echo -e "${YELLOW}Hinweis: Service-Restart übersprungen (kein sudo).${NC}"
    echo "Bitte einmalig als root ausführen: systemctl restart tribefinder"
fi

# Warte kurz und prüfe Status
sleep 2
if [ "$CAN_SUDO" -eq 1 ]; then
    if sudo systemctl is-active --quiet tribefinder; then
        echo -e "${GREEN}✓ Service erfolgreich gestartet!${NC}"
    else
        echo -e "${RED}✗ Service konnte nicht gestartet werden!${NC}"
        echo "Prüfe die Logs mit: sudo journalctl -u tribefinder -n 50"
        exit 1
    fi
else
    echo -e "${YELLOW}Status-Check übersprungen (kein sudo).${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}Deployment erfolgreich abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Nützliche Befehle:"
echo "  Status prüfen:  sudo systemctl status tribefinder"
echo "  Logs anzeigen:  sudo journalctl -u tribefinder -f"
echo "  Service stoppen: sudo systemctl stop tribefinder"
echo "  Service starten: sudo systemctl start tribefinder"
echo ""
