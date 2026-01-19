#!/bin/bash
# TribeFinder - Initiales Setup Script für Ubuntu LXC
# Führt die komplette Installation durch

set -e

echo "=========================================="
echo "TribeFinder - Native Installation"
echo "=========================================="
echo ""

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Prüfe ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Bitte als root ausführen: sudo ./scripts/setup-native.sh${NC}"
    exit 1
fi

echo -e "${BLUE}Dieses Script führt folgende Schritte aus:${NC}"
echo "1. System-Pakete installieren (Node.js, Nginx, etc.)"
echo "2. tribefinder User erstellen"
echo "3. TribeFinder installieren und konfigurieren"
echo "4. Systemd Service einrichten"
echo "5. Nginx konfigurieren"
echo ""
read -p "Fortfahren? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi
echo ""

# 1. System-Pakete
echo -e "${YELLOW}[1/5] Installiere System-Pakete...${NC}"
apt update
apt install -y git curl ca-certificates openssl nginx certbot python3-certbot-nginx

# Node.js installieren
if ! command -v node &> /dev/null; then
    echo "Installiere Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo "Node.js Version: $(node -v)"
echo "npm Version: $(npm -v)"
echo ""

# 2. User erstellen
echo -e "${YELLOW}[2/5] Erstelle tribefinder User...${NC}"
if id "tribefinder" &>/dev/null; then
    echo "User 'tribefinder' existiert bereits."
else
    useradd -r -m -s /bin/bash tribefinder
    echo -e "${GREEN}User 'tribefinder' erstellt.${NC}"
fi
echo ""

# 3. TribeFinder installieren
echo -e "${YELLOW}[3/5] Installiere TribeFinder...${NC}"

# Prüfe ob wir bereits im Repo sind
if [ -f "package.json" ]; then
    INSTALL_DIR=$(pwd)
    echo "Nutze aktuelles Verzeichnis: $INSTALL_DIR"
else
    INSTALL_DIR="/home/tribefinder/TribeFinder"
    
    if [ -d "$INSTALL_DIR" ]; then
        echo "Verzeichnis $INSTALL_DIR existiert bereits."
        read -p "Neu klonen? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
            sudo -u tribefinder git clone https://github.com/Schello805/TribeFinder.git "$INSTALL_DIR"
        fi
    else
        sudo -u tribefinder git clone https://github.com/Schello805/TribeFinder.git "$INSTALL_DIR"
    fi
fi

cd "$INSTALL_DIR"

# .env erstellen falls nicht vorhanden
if [ ! -f ".env" ]; then
    echo "Erstelle .env Datei..."
    cp .env.example .env
    
    # Generiere Secret
    SECRET=$(openssl rand -base64 32)
    sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$SECRET\"|" .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:./prod.db\"|" .env
    
    echo -e "${YELLOW}WICHTIG: Bearbeite /home/tribefinder/TribeFinder/.env und setze:${NC}"
    echo "  - NEXTAUTH_URL (deine Domain)"
    echo "  - Optional: SMTP-Einstellungen"
    echo ""
    read -p "Drücke Enter wenn du .env bearbeitet hast..."
fi

# Dependencies installieren
echo "Installiere Dependencies..."
sudo -u tribefinder npm install

# Prisma Setup
echo "Initialisiere Datenbank..."
sudo -u tribefinder npm run db:generate
sudo -u tribefinder npm run db:migrate

# Build
echo "Erstelle Production Build..."
sudo -u tribefinder npm run build

# Upload-Verzeichnis
mkdir -p public/uploads
chown -R tribefinder:tribefinder public/uploads
chmod 755 public/uploads

# Rechte setzen
chown -R tribefinder:tribefinder "$INSTALL_DIR"

echo ""

# 4. Systemd Service
echo -e "${YELLOW}[4/5] Richte Systemd Service ein...${NC}"
cp config/tribefinder.service /etc/systemd/system/tribefinder.service

# Passe WorkingDirectory an falls nötig
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$INSTALL_DIR|" /etc/systemd/system/tribefinder.service

systemctl daemon-reload
systemctl enable tribefinder
systemctl start tribefinder

sleep 2
if systemctl is-active --quiet tribefinder; then
    echo -e "${GREEN}✓ Service läuft!${NC}"
else
    echo -e "${RED}✗ Service konnte nicht gestartet werden!${NC}"
    echo "Prüfe: journalctl -u tribefinder -n 50"
fi
echo ""

# 5. Nginx
echo -e "${YELLOW}[5/5] Konfiguriere Nginx...${NC}"

read -p "Domain-Name (z.B. tribefinder.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "Keine Domain angegeben, überspringe Nginx-Setup."
else
    # Nginx Config erstellen
    cp config/nginx.conf /etc/nginx/sites-available/tribefinder
    sed -i "s|deine-domain.de|$DOMAIN|g" /etc/nginx/sites-available/tribefinder
    
    # Aktivieren
    ln -sf /etc/nginx/sites-available/tribefinder /etc/nginx/sites-enabled/
    
    # Test
    nginx -t
    systemctl restart nginx
    
    echo -e "${GREEN}✓ Nginx konfiguriert für $DOMAIN${NC}"
    echo ""
    
    # SSL Setup anbieten
    read -p "SSL-Zertifikat mit Let's Encrypt einrichten? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot --nginx -d "$DOMAIN"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Nächste Schritte:"
echo "1. Öffne https://$DOMAIN in deinem Browser"
echo "2. Registriere einen Account"
echo "3. Mache dich zum Admin:"
echo "   sudo su - tribefinder"
echo "   cd TribeFinder"
echo "   node make-admin.js deine@email.de"
echo ""
echo "Nützliche Befehle:"
echo "  Status:  sudo systemctl status tribefinder"
echo "  Logs:    sudo journalctl -u tribefinder -f"
echo "  Updates: sudo su - tribefinder && cd TribeFinder && ./scripts/deploy-native.sh"
echo ""
