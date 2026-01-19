#!/bin/bash
# TribeFinder - Initiales Setup Script für Ubuntu LXC
# Führt die komplette Installation durch

# Script Version
SCRIPT_VERSION="1.0.7"

set -e

echo "=========================================="
echo "TribeFinder - Native Installation"
echo "Version: $SCRIPT_VERSION"
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
    # Stelle sicher dass Home-Verzeichnis existiert
    if [ ! -d "/home/tribefinder" ]; then
        echo "Erstelle Home-Verzeichnis..."
        mkdir -p /home/tribefinder
        chown tribefinder:tribefinder /home/tribefinder
    fi
else
    useradd -r -m -s /bin/bash tribefinder
    echo -e "${GREEN}User 'tribefinder' erstellt.${NC}"
fi
echo "tribefinder passwd entry: $(getent passwd tribefinder || true)"
echo ""

# 3. TribeFinder installieren
echo -e "${YELLOW}[3/5] Installiere TribeFinder...${NC}"

INSTALL_DIR="/home/tribefinder/TribeFinder"

# Prüfe ob wir bereits im Repo sind (z.B. in /root/TribeFinder)
if [ -f "package.json" ]; then
    CURRENT_DIR=$(pwd)
    echo "Repo gefunden in: $CURRENT_DIR"
    
    # Wenn wir nicht bereits in /home/tribefinder/TribeFinder sind, verschiebe es
    if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
        echo "Verschiebe nach $INSTALL_DIR..."
        
        # Lösche Zielverzeichnis falls vorhanden
        if [ -d "$INSTALL_DIR" ]; then
            rm -rf "$INSTALL_DIR"
        fi
        
        # Verschiebe das Repo
        mv "$CURRENT_DIR" "$INSTALL_DIR"
        
        # Setze Rechte
        chown -R tribefinder:tribefinder "$INSTALL_DIR"
        
        # Wechsle ins neue Verzeichnis
        cd "$INSTALL_DIR"
    else
        # Bereits im richtigen Verzeichnis
        cd "$INSTALL_DIR"
    fi
else
    # Kein Repo gefunden, klone es
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
    
    cd "$INSTALL_DIR"
fi

# Stelle sicher dass wir im richtigen Verzeichnis sind
echo "Arbeitsverzeichnis: $(pwd)"

# .env erstellen falls nicht vorhanden
if [ ! -f ".env" ]; then
    echo "Erstelle .env Datei..."
    
    # Generiere Secret
    SECRET=$(openssl rand -base64 32)
    
    # Erstelle .env direkt (statt .env.example zu kopieren)
    cat > .env << EOF
# Database
DATABASE_URL="file:./prod.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$SECRET"

# Optional: SMTP für E-Mail-Versand
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=
EOF
    
    chown tribefinder:tribefinder .env
    
    echo -e "${GREEN}.env Datei erstellt mit automatisch generiertem Secret${NC}"
    echo -e "${YELLOW}Hinweis: Du kannst später NEXTAUTH_URL und SMTP in /home/tribefinder/TribeFinder/.env anpassen${NC}"
fi

# Dependencies installieren
echo "Installiere Dependencies..."
cd "$INSTALL_DIR"
if [ -f "package-lock.json" ]; then
    sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm ci --include=optional'
else
    sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm install'
fi

# Expliziter Fix für npm optionalDependencies Bug (@tailwindcss/oxide native binding)
if [ ! -d "node_modules/@tailwindcss/oxide-linux-x64-gnu" ]; then
    echo "Installiere Tailwind Oxide Linux Binary explizit..."
    sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && npm install --no-save @tailwindcss/oxide-linux-x64-gnu@4.1.18'
fi

# Workaround für Tailwind CSS optional dependencies Bug
echo "Behebe Tailwind CSS native bindings..."
rm -rf node_modules
if [ -f "package-lock.json" ]; then
    sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm ci --include=optional'
else
    sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm install'
fi

if [ ! -d "node_modules/@tailwindcss/oxide-linux-x64-gnu" ]; then
    echo "Installiere Tailwind Oxide Linux Binary explizit (nach Reinstall)..."
    sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && npm install --no-save @tailwindcss/oxide-linux-x64-gnu@4.1.18'
fi

# Prisma Setup
echo "Initialisiere Datenbank..."
cd "$INSTALL_DIR"
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm run db:generate'
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm run db:migrate'

# Build
echo "Erstelle Production Build..."
cd "$INSTALL_DIR"
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm run build'

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

read -p "Domain-Name (z.B. tribefinder.example.com, oder Enter für localhost): " DOMAIN

if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
    echo "Keine Domain angegeben, nutze localhost (nur lokal erreichbar)"
    
    # Setze NEXTAUTH_URL auf localhost
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://localhost:3000\"|" "$INSTALL_DIR/.env"
else
    # Setze NEXTAUTH_URL auf die eingegebene Domain
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://$DOMAIN\"|" "$INSTALL_DIR/.env"
    echo -e "${GREEN}NEXTAUTH_URL gesetzt auf: https://$DOMAIN${NC}"
fi

if [ "$DOMAIN" != "localhost" ]; then
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
else
    echo "Localhost-Modus: Nginx-Setup übersprungen"
    echo "Die App wird auf http://localhost:3000 laufen"
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
