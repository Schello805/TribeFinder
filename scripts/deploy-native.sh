#!/bin/bash
# TribeFinder - Native Deployment Script
# Für Ubuntu LXC ohne Docker

set -e

# Ensure DATABASE_URL is available for this script even when executed outside systemd.
if [ -z "${DATABASE_URL:-}" ] && [ -f ".env" ]; then
    DBURL_LINE=$(grep -E '^DATABASE_URL=' .env | head -n 1 || true)
    if [ -n "$DBURL_LINE" ]; then
        DBURL_VALUE=${DBURL_LINE#DATABASE_URL=}
        DBURL_VALUE=$(echo "$DBURL_VALUE" | sed -E "s/^[[:space:]]*['\"]?(.*?)['\"]?[[:space:]]*$/\1/")
        export DATABASE_URL="$DBURL_VALUE"
    fi
fi

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

# Stelle sicher dass Upload-Verzeichnis existiert (und beschreibbar ist)
UPLOADS_DIR="/var/www/tribefinder/uploads"
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

# public/uploads als Symlink auf /var/www/... (robust für Nginx in LXC)
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

CAN_SUDO=0
if command -v sudo >/dev/null 2>&1; then
    if sudo -v; then
        CAN_SUDO=1
    fi
fi

# Backup erstellen
echo -e "${YELLOW}[1/7] Erstelle Datenbank-Backup...${NC}"
npm run db:backup || echo "Backup fehlgeschlagen (möglicherweise keine DB vorhanden oder DATABASE_URL nicht SQLite)"
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
    echo -e "${YELLOW}Stoppe Service für Migration (verhindert SQLite Lock)...${NC}"
    sudo systemctl stop tribefinder || true
    sleep 2
else
    echo -e "${RED}Fehler: Migrationen benötigen einen gestoppten Service, aber sudo ist nicht verfügbar.${NC}"
    echo "Bitte einmalig als root ausführen: systemctl stop tribefinder"
    echo "Dann dieses Script erneut starten."
    exit 1
fi

MIGRATE_OK=0
for i in 1 2 3; do
    if npm run db:migrate; then
        MIGRATE_OK=1
        break
    fi

    DBURL="${DATABASE_URL:-}"
    LOCK_PROVIDER=""
    if [ -f "prisma/migrations/migration_lock.toml" ]; then
        LOCK_PROVIDER=$(grep -E '^provider\s*=\s*"' prisma/migrations/migration_lock.toml | sed -E 's/^provider\s*=\s*"([^"]+)".*/\1/')
    fi
    if echo "$DBURL" | grep -q '^postgresql://\|^postgres://'; then
        if [ "$LOCK_PROVIDER" = "sqlite" ]; then
            echo -e "${YELLOW}Hinweis: Migrationen sind für SQLite gelockt, aber DATABASE_URL ist Postgres. Verwende 'prisma db push' als Baseline...${NC}"
            if npx prisma db push --accept-data-loss; then
                MIGRATE_OK=1
                break
            fi
        fi
    fi
    echo -e "${YELLOW}Migration fehlgeschlagen (Versuch $i/3). Warte kurz und versuche erneut...${NC}"
    sleep 2
done

if [ "$MIGRATE_OK" -ne 1 ]; then
    echo -e "${RED}Fehler: Migrationen sind nach mehreren Versuchen fehlgeschlagen.${NC}"
    echo "Hinweis: Prüfe, ob noch ein Prozess prod.db offen hält (z.B. per: sudo lsof /home/tribefinder/TribeFinder/prod.db)"
    exit 1
fi

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
echo ""

# Auto-Backup Timer/Service aktualisieren (falls vorhanden)
echo -e "${YELLOW}[6.1/7] Aktualisiere Auto-Backup Timer...${NC}"
if [ "$CAN_SUDO" -eq 1 ]; then
    sudo cp -f config/tribefinder.service /etc/systemd/system/tribefinder.service || true
    sudo cp -f config/tribefinder-auto-backup.service /etc/systemd/system/tribefinder-auto-backup.service || true
    sudo cp -f config/tribefinder-auto-backup.timer /etc/systemd/system/tribefinder-auto-backup.timer || true
    sudo systemctl daemon-reload || true
    sudo systemctl enable tribefinder-auto-backup.timer || true
    sudo systemctl start tribefinder-auto-backup.timer || true
else
    echo -e "${YELLOW}Hinweis: Auto-Backup Timer übersprungen (User 'tribefinder' hat kein sudo).${NC}"
    echo "Einmalig als root ausführen:"
    echo "  cp -f config/tribefinder.service /etc/systemd/system/tribefinder.service"
    echo "  cp -f config/tribefinder-auto-backup.service /etc/systemd/system/tribefinder-auto-backup.service"
    echo "  cp -f config/tribefinder-auto-backup.timer /etc/systemd/system/tribefinder-auto-backup.timer"
    echo "  systemctl daemon-reload"
    echo "  systemctl enable --now tribefinder-auto-backup.timer"
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
