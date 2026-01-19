#!/bin/bash
# TribeFinder - Native Deployment Script
# Für Ubuntu LXC ohne Docker

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

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
    echo -e "${RED}Fehler: package.json nicht gefunden!${NC}"
    echo "Bitte führe das Script im TribeFinder-Verzeichnis aus."
    exit 1
fi

# Backup erstellen
echo -e "${YELLOW}[1/7] Erstelle Datenbank-Backup...${NC}"
if [ -f "dev.db" ] || [ -f "prod.db" ]; then
    npm run db:backup || echo "Backup fehlgeschlagen (möglicherweise keine DB vorhanden)"
else
    echo "Keine Datenbank gefunden, überspringe Backup."
fi
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
npm install
echo ""

# Prisma generieren
echo -e "${YELLOW}[4/7] Generiere Prisma Client...${NC}"
npm run db:generate
echo ""

# Migrationen ausführen
echo -e "${YELLOW}[5/7] Führe Datenbank-Migrationen aus...${NC}"
npm run db:migrate
echo ""

# Production Build
echo -e "${YELLOW}[6/7] Erstelle Production Build...${NC}"
npm run build
echo ""

# Service neustarten
echo -e "${YELLOW}[7/7] Starte Service neu...${NC}"
sudo systemctl restart tribefinder

# Warte kurz und prüfe Status
sleep 2
if sudo systemctl is-active --quiet tribefinder; then
    echo -e "${GREEN}✓ Service erfolgreich gestartet!${NC}"
else
    echo -e "${RED}✗ Service konnte nicht gestartet werden!${NC}"
    echo "Prüfe die Logs mit: sudo journalctl -u tribefinder -n 50"
    exit 1
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
