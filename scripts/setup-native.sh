#!/bin/bash
# TribeFinder - Initiales Setup Script für Ubuntu LXC
# Führt die komplette Installation durch

# Script Version
SCRIPT_VERSION="1.1.0"

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
echo "1. System-Pakete installieren (Node.js, etc.)"
echo "2. tribefinder User erstellen"
echo "3. TribeFinder installieren und konfigurieren"
echo "4. Systemd Service einrichten"
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
apt install -y git curl ca-certificates openssl acl postgresql-client

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
    useradd -m -s /bin/bash tribefinder
    echo -e "${GREEN}User 'tribefinder' erstellt.${NC}"
fi

PASS_STATUS="$(passwd -S tribefinder 2>/dev/null | awk '{print $2}' || true)"
if [ "$PASS_STATUS" != "P" ]; then
    echo -e "${YELLOW}Bitte setze jetzt ein Passwort für den User 'tribefinder' (wird für sudo/Updates benötigt).${NC}"
    passwd tribefinder
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

# Stelle sicher, dass das Repo dem richtigen User gehört (verhindert Git "dubious ownership")
chown -R tribefinder:tribefinder "$INSTALL_DIR"

# Stelle sicher dass wir im richtigen Verzeichnis sind
echo "Arbeitsverzeichnis: $(pwd)"

# Upload-Verzeichnis früh anlegen (damit Uploads ab dem ersten Start funktionieren)
UPLOADS_DIR="/var/www/tribefinder/uploads"
mkdir -p "$UPLOADS_DIR"
chown -R tribefinder:tribefinder "$UPLOADS_DIR"
chmod 755 "$UPLOADS_DIR"

# public/uploads als Symlink auf /var/www/...
if [ -L "public/uploads" ]; then
    :
elif [ -d "public/uploads" ]; then
    # Falls bereits ein echtes Verzeichnis existiert, Inhalte migrieren und ersetzen
    if [ "$(ls -A public/uploads 2>/dev/null | wc -l)" -gt 0 ]; then
        cp -a public/uploads/. "$UPLOADS_DIR/" || true
    fi
    rm -rf public/uploads
fi
ln -sfn "$UPLOADS_DIR" public/uploads
chown -h tribefinder:tribefinder public/uploads

# Backups-Verzeichnis (für manuelle + automatische Backups)
mkdir -p backups
chown -R tribefinder:tribefinder backups
chmod 755 backups



# .env erstellen falls nicht vorhanden
if [ ! -f ".env" ]; then
    echo "Erstelle .env Datei..."
    
    # Generiere Secret
    SECRET=$(openssl rand -base64 32)
    
    # Erstelle .env direkt (statt .env.example zu kopieren)
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://tribefinder:CHANGE_ME@localhost:5432/tribefinder?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$SECRET"

# Optional: SMTP für E-Mail-Versand
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASSWORD=
# SMTP_FROM=
EOF
    
    chown tribefinder:tribefinder .env
    chmod 600 .env
    
    echo -e "${GREEN}.env Datei erstellt mit automatisch generiertem Secret${NC}"
    echo -e "${YELLOW}Hinweis: Du kannst später NEXTAUTH_URL und SMTP in /home/tribefinder/TribeFinder/.env anpassen${NC}"
fi

set_env_var() {
    local key="$1"
    local value="$2"
    if grep -qE "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=\"${value}\"|" .env
    else
        echo "${key}=\"${value}\"" >> .env
    fi
}

get_env_var() {
    local key="$1"
    grep -E "^${key}=" .env | head -n 1 | sed -E 's/^[^=]+=//; s/^\"//; s/\"$//'
}

ADMIN_EMAIL_CURRENT="$(get_env_var DEFAULT_ADMIN_EMAIL)"
if [ -z "${ADMIN_EMAIL_CURRENT}" ]; then
    echo
    read -r -p "Admin E-Mail (wird beim Registrieren automatisch ADMIN) : " DEFAULT_ADMIN_EMAIL
    if [ -z "${DEFAULT_ADMIN_EMAIL}" ] || ! echo "${DEFAULT_ADMIN_EMAIL}" | grep -q "@"; then
        echo -e "${RED}Fehler: Bitte eine gültige E-Mail-Adresse angeben.${NC}"
        exit 1
    fi
    set_env_var DEFAULT_ADMIN_EMAIL "${DEFAULT_ADMIN_EMAIL}"
fi

SMTP_HOST_CURRENT="$(get_env_var SMTP_HOST)"
SMTP_USER_CURRENT="$(get_env_var SMTP_USER)"
SMTP_PASSWORD_CURRENT="$(get_env_var SMTP_PASSWORD)"

if [ -z "${SMTP_HOST_CURRENT}" ] || [ -z "${SMTP_USER_CURRENT}" ] || [ -z "${SMTP_PASSWORD_CURRENT}" ]; then
    echo
    echo -e "${YELLOW}SMTP Setup (erforderlich für E-Mail-Bestätigung)${NC}"

    read -r -p "SMTP Host: " SMTP_HOST
    if [ -z "${SMTP_HOST}" ]; then
        echo -e "${RED}Fehler: SMTP Host darf nicht leer sein.${NC}"
        exit 1
    fi

    read -r -p "SMTP Port [587]: " SMTP_PORT
    SMTP_PORT="${SMTP_PORT:-587}"

    read -r -p "SMTP User: " SMTP_USER
    if [ -z "${SMTP_USER}" ]; then
        echo -e "${RED}Fehler: SMTP User darf nicht leer sein.${NC}"
        exit 1
    fi

    read -r -s -p "SMTP Passwort: " SMTP_PASSWORD
    echo
    if [ -z "${SMTP_PASSWORD}" ]; then
        echo -e "${RED}Fehler: SMTP Passwort darf nicht leer sein.${NC}"
        exit 1
    fi

    read -r -p "SMTP Secure (true/false) [false]: " SMTP_SECURE
    SMTP_SECURE="${SMTP_SECURE:-false}"
    if [ "${SMTP_SECURE}" != "true" ] && [ "${SMTP_SECURE}" != "false" ]; then
        echo -e "${RED}Fehler: SMTP_SECURE muss true oder false sein.${NC}"
        exit 1
    fi

    read -r -p "SMTP From [\"TribeFinder\" <noreply@tribefinder.de>]: " SMTP_FROM
    SMTP_FROM="${SMTP_FROM:-\"TribeFinder\" <noreply@tribefinder.de>}"

    set_env_var SMTP_HOST "${SMTP_HOST}"
    set_env_var SMTP_PORT "${SMTP_PORT}"
    set_env_var SMTP_USER "${SMTP_USER}"
    set_env_var SMTP_PASSWORD "${SMTP_PASSWORD}"
    set_env_var SMTP_SECURE "${SMTP_SECURE}"
    set_env_var SMTP_FROM "${SMTP_FROM}"

    chown tribefinder:tribefinder .env
    chmod 600 .env
    echo -e "${GREEN}✓ SMTP konfiguriert.${NC}"
fi

if grep -q 'CHANGE_ME' .env; then
    echo -e "${YELLOW}PostgreSQL Setup: DATABASE_URL ist noch nicht konfiguriert.${NC}"

    if ! command -v psql >/dev/null 2>&1; then
        echo -e "${RED}Fehler: psql fehlt. Bitte installiere postgresql-client und starte erneut.${NC}"
        exit 1
    fi

    if ! command -v systemctl >/dev/null 2>&1; then
        echo -e "${RED}Fehler: systemctl nicht gefunden. Dieses Setup erwartet systemd (Ubuntu/Debian).${NC}"
        exit 1
    fi

    if ! systemctl status postgresql >/dev/null 2>&1; then
        echo -e "${YELLOW}Installiere PostgreSQL Server...${NC}"
        apt update
        apt install -y postgresql postgresql-contrib
        systemctl enable --now postgresql
    fi

    echo
    read -r -p "PostgreSQL DB Name [tribefinder]: " PG_DB
    PG_DB="${PG_DB:-tribefinder}"

    read -r -p "PostgreSQL User [tribefinder]: " PG_USER
    PG_USER="${PG_USER:-tribefinder}"

    echo
    read -r -s -p "PostgreSQL Passwort für User '$PG_USER': " PG_PASS
    echo
    if [ -z "$PG_PASS" ]; then
        echo -e "${RED}Fehler: Passwort darf nicht leer sein.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Lege DB/User an (idempotent)...${NC}"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1 || \
      sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER \"${PG_USER}\" WITH PASSWORD '${PG_PASS}';"

    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER \"${PG_USER}\" WITH PASSWORD '${PG_PASS}';"

    sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 || \
      sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${PG_DB}\" OWNER \"${PG_USER}\";"

    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE \"${PG_DB}\" TO \"${PG_USER}\";"

    PG_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}?schema=public"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$PG_URL\"|" .env
    chown tribefinder:tribefinder .env
    chmod 600 .env

    echo -e "${GREEN}✓ DATABASE_URL gesetzt.${NC}"
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

echo "Teste SMTP Konfiguration..."
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && set -a && . ./.env && set +a && node -e "const nodemailer=require(\"nodemailer\"); const host=process.env.SMTP_HOST; const port=Number(process.env.SMTP_PORT||587); const user=process.env.SMTP_USER; const pass=process.env.SMTP_PASSWORD; const secure=(process.env.SMTP_SECURE===\"true\"); if(!host||!user||!pass){console.error(\"SMTP Konfiguration fehlt (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)\"); process.exit(1);} const t=nodemailer.createTransport({host,port,secure,auth:{user,pass}}); t.verify().then(()=>{console.log(\"✓ SMTP OK\");}).catch((e)=>{console.error(\"SMTP Fehler:\", e && (e.message||e)); process.exit(1);});"'
if [ $? -ne 0 ]; then
    echo -e "${RED}Fehler: SMTP Test fehlgeschlagen. Bitte korrigiere SMTP_* in .env und starte das Setup erneut.${NC}"
    exit 1
fi

# Prisma Setup
echo "Initialisiere Datenbank-Schema (Prisma)..."
cd "$INSTALL_DIR"
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm run db:generate'
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && bash ./scripts/db-migrate-safe.sh'

# Default DanceStyles seeden (für Erstinstallation)
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm run db:seed-styles'

# Build
echo "Erstelle Production Build..."
cd "$INSTALL_DIR"
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && echo HOME=$HOME && npm run build'

# Rechte setzen
chown -R tribefinder:tribefinder "$INSTALL_DIR"

echo ""

# 4. Systemd Service
echo -e "${YELLOW}[4/5] Richte Systemd Service ein...${NC}"
cp config/tribefinder.service /etc/systemd/system/tribefinder.service

# Auto-Backup Timer installieren (stündlicher Check, Intervall im Admin-Backups Tab)
cp config/tribefinder-auto-backup.service /etc/systemd/system/tribefinder-auto-backup.service
cp config/tribefinder-auto-backup.timer /etc/systemd/system/tribefinder-auto-backup.timer

# Passe WorkingDirectory an falls nötig
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$INSTALL_DIR|" /etc/systemd/system/tribefinder.service

systemctl daemon-reload
systemctl enable tribefinder
systemctl start tribefinder

systemctl enable tribefinder-auto-backup.timer
systemctl start tribefinder-auto-backup.timer

sleep 2
if systemctl is-active --quiet tribefinder; then
    echo -e "${GREEN}✓ Service läuft!${NC}"
else
    echo -e "${RED}✗ Service konnte nicht gestartet werden!${NC}"
    echo "Prüfe: journalctl -u tribefinder -n 50"
fi
echo ""

sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://localhost:3000\"|" "$INSTALL_DIR/.env"

echo ""
echo "=========================================="
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Nächste Schritte:"
echo "1. Öffne http://localhost:3000 in deinem Browser"
echo "2. Registriere einen Account"
echo "3. Mache dich zum Admin:"
echo "   sudo su - tribefinder"
echo "   cd /home/tribefinder/TribeFinder"
echo "   node ./make-admin.js deine@email.de"
echo ""
echo "Nützliche Befehle:"
echo "  Status:  sudo systemctl status tribefinder"
echo "  Logs:    sudo journalctl -u tribefinder -f"
echo "  Updates: sudo su - tribefinder && cd TribeFinder && ./scripts/deploy-native.sh"
echo ""
