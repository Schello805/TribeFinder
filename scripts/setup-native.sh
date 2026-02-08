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

# Stelle sicher, dass tribefinder sudo nutzen kann (für Deploy/Update Scripts)
if getent group sudo >/dev/null 2>&1; then
    usermod -aG sudo tribefinder
    echo "tribefinder ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/tribefinder
    chmod 440 /etc/sudoers.d/tribefinder
else
    echo -e "${YELLOW}Warnung: 'sudo' Gruppe nicht gefunden – sudo Rechte für 'tribefinder' wurden nicht gesetzt.${NC}"
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
mkdir -p "/var/www/tribefinder"
chown -R tribefinder:tribefinder "/var/www/tribefinder"
chmod 755 "/var/www/tribefinder" || true
mkdir -p "$UPLOADS_DIR"
chown -R tribefinder:tribefinder "$UPLOADS_DIR"
chmod 755 "$UPLOADS_DIR"

# Backups-Verzeichnis auf dem Server-Dateisystem (für Backup/Restore API)
SERVER_BACKUPS_DIR="/var/www/tribefinder/backups"
mkdir -p "$SERVER_BACKUPS_DIR"
chown -R tribefinder:tribefinder "$SERVER_BACKUPS_DIR"
chmod 755 "$SERVER_BACKUPS_DIR"

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

# File storage
UPLOADS_DIR="/var/www/tribefinder/uploads"
BACKUP_DIR="/var/www/tribefinder/backups"

# Maintenance
MAINTENANCE_MODE="false"

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

# App Version/Commit für Footer (damit Instanzen vergleichbar sind)
APP_VERSION=$(sudo -u tribefinder node -p "require('./package.json').version" 2>/dev/null || echo "")
APP_COMMIT=$(sudo -u tribefinder git rev-parse --short HEAD 2>/dev/null || echo "")

if [ -n "$APP_VERSION" ]; then
    if grep -q '^NEXT_PUBLIC_APP_VERSION=' .env; then
        sed -i "s|^NEXT_PUBLIC_APP_VERSION=.*|NEXT_PUBLIC_APP_VERSION=\"$APP_VERSION\"|" .env
    else
        echo "NEXT_PUBLIC_APP_VERSION=\"$APP_VERSION\"" >> .env
    fi
fi

if [ -n "$APP_COMMIT" ]; then
    if grep -q '^NEXT_PUBLIC_APP_COMMIT=' .env; then
        sed -i "s|^NEXT_PUBLIC_APP_COMMIT=.*|NEXT_PUBLIC_APP_COMMIT=\"$APP_COMMIT\"|" .env
    else
        echo "NEXT_PUBLIC_APP_COMMIT=\"$APP_COMMIT\"" >> .env
    fi
fi

set_env_var() {
    local key="$1"
    local value="$2"
    # Escape backslashes and double quotes for dotenv-style KEY="value" lines.
    # This prevents broken .env files when values contain quotes (e.g., SMTP_FROM).
    local escaped
    escaped="${value//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    if grep -qE "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=\"${escaped}\"|" .env
    else
        echo "${key}=\"${escaped}\"" >> .env
    fi
}

get_env_var() {
    local key="$1"
    grep -E "^${key}=" .env | head -n 1 | sed -E 's/^[^=]+=//; s/^\"//; s/\"$//'
}

NEXTAUTH_URL_CURRENT="$(get_env_var NEXTAUTH_URL)"
if [ -z "${NEXTAUTH_URL_CURRENT}" ] || echo "${NEXTAUTH_URL_CURRENT}" | grep -qi "localhost"; then
    echo
    while true; do
        read -r -p "Öffentliche Base-URL (für E-Mail Links) [http://localhost:3000]: " PUBLIC_BASE_URL
        PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://localhost:3000}"
        if ! echo "${PUBLIC_BASE_URL}" | grep -qE '^https?://'; then
            echo -e "${RED}Fehler: Bitte eine gültige URL angeben (muss mit http:// oder https:// beginnen).${NC}"
            continue
        fi
        PUBLIC_BASE_URL="${PUBLIC_BASE_URL%/}"
        break
    done
    set_env_var NEXTAUTH_URL "${PUBLIC_BASE_URL}"
    set_env_var SITE_URL "${PUBLIC_BASE_URL}"
    chown tribefinder:tribefinder .env
    chmod 600 .env
fi

ADMIN_EMAIL_CURRENT="$(get_env_var DEFAULT_ADMIN_EMAIL)"
if [ -z "${ADMIN_EMAIL_CURRENT}" ]; then
    echo
    while true; do
        read -r -p "Admin E-Mail (wird beim Registrieren automatisch ADMIN) : " DEFAULT_ADMIN_EMAIL
        if [ -z "${DEFAULT_ADMIN_EMAIL}" ] || ! echo "${DEFAULT_ADMIN_EMAIL}" | grep -q "@"; then
            echo -e "${RED}Fehler: Bitte eine gültige E-Mail-Adresse angeben.${NC}"
            continue
        fi
        break
    done
    set_env_var DEFAULT_ADMIN_EMAIL "${DEFAULT_ADMIN_EMAIL}"
fi

SMTP_HOST_CURRENT="$(get_env_var SMTP_HOST)"
SMTP_USER_CURRENT="$(get_env_var SMTP_USER)"
SMTP_PASSWORD_CURRENT="$(get_env_var SMTP_PASSWORD)"

if [ -z "${SMTP_HOST_CURRENT}" ] || [ -z "${SMTP_USER_CURRENT}" ] || [ -z "${SMTP_PASSWORD_CURRENT}" ]; then
    echo
    echo -e "${YELLOW}SMTP Setup (erforderlich für E-Mail-Bestätigung)${NC}"

    while true; do
        read -r -p "SMTP Host: " SMTP_HOST
        if [ -z "${SMTP_HOST}" ]; then
            echo -e "${RED}Fehler: SMTP Host darf nicht leer sein.${NC}"
            continue
        fi
        break
    done

    read -r -p "SMTP Port [587]: " SMTP_PORT
    SMTP_PORT="${SMTP_PORT:-587}"

    while true; do
        read -r -p "SMTP User: " SMTP_USER
        if [ -z "${SMTP_USER}" ]; then
            echo -e "${RED}Fehler: SMTP User darf nicht leer sein.${NC}"
            continue
        fi
        break
    done

    while true; do
        read -r -s -p "SMTP Passwort: " SMTP_PASSWORD
        echo
        if [ -z "${SMTP_PASSWORD}" ]; then
            echo -e "${RED}Fehler: SMTP Passwort darf nicht leer sein.${NC}"
            continue
        fi
        break
    done

    while true; do
        read -r -p "SMTP Secure (true/false) [false]: " SMTP_SECURE
        SMTP_SECURE="${SMTP_SECURE:-false}"
        if [ "${SMTP_SECURE}" != "true" ] && [ "${SMTP_SECURE}" != "false" ]; then
            echo -e "${RED}Fehler: SMTP_SECURE muss true oder false sein.${NC}"
            continue
        fi
        break
    done

    read -r -p "SMTP From [TribeFinder <noreply@tribefinder.de>]: " SMTP_FROM
    SMTP_FROM="${SMTP_FROM:-TribeFinder <noreply@tribefinder.de>}"

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
    while [ -z "$PG_PASS" ]; do
        echo -e "${RED}Fehler: Passwort darf nicht leer sein.${NC}"
        read -r -s -p "PostgreSQL Passwort für User '$PG_USER': " PG_PASS
        echo
    done

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
sudo -u tribefinder env HOME=/home/tribefinder bash -c 'cd '"$INSTALL_DIR"' && set -a && . ./.env && set +a && node -e "const nodemailer=require(\"nodemailer\"); const host=process.env.SMTP_HOST; const port=Number(process.env.SMTP_PORT||587); const user=process.env.SMTP_USER; const pass=process.env.SMTP_PASSWORD; const secure=(process.env.SMTP_SECURE===\"true\"); if(!host||!user||!pass){console.error(\"SMTP Konfiguration fehlt (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)\"); process.exit(2);} const t=nodemailer.createTransport({host,port,secure,auth:{user,pass}}); t.verify().then(()=>{console.log(\"✓ SMTP OK\");}).catch((e)=>{const msg=String((e && (e.message||e))||\"\"); console.error(\"SMTP Fehler:\", msg); if(msg.toLowerCase().includes(\"wrong version number\")){ console.error(\"Hinweis: Das ist meist eine falsche Kombination aus Port und SMTP_SECURE.\"); console.error(\"- Port 587: SMTP_SECURE=false (STARTTLS/Upgrade)\"); console.error(\"- Port 465: SMTP_SECURE=true (SMTPS)\"); } process.exit(2);});"'
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warnung: SMTP Test fehlgeschlagen. Die Installation läuft weiter, aber E-Mail-Funktionen (Verifizierung/Passwort-Reset) funktionieren erst nach korrekter SMTP Konfiguration.${NC}"
    echo -e "${YELLOW}Du kannst SMTP_* später in /home/tribefinder/TribeFinder/.env anpassen und danach den Service neu starten.${NC}"
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

# Next.js standalone served static files live under .next/standalone/public
# Ensure uploads are reachable under /uploads/* in production
mkdir -p "$INSTALL_DIR/.next/standalone/public"
rm -rf "$INSTALL_DIR/.next/standalone/public/uploads" || true
ln -sfn "$UPLOADS_DIR" "$INSTALL_DIR/.next/standalone/public/uploads"
chown -h tribefinder:tribefinder "$INSTALL_DIR/.next/standalone/public/uploads" || true

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
echo "=========================================="
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Nächste Schritte:"
echo "1. Öffne die im Setup gesetzte NEXTAUTH_URL in deinem Browser"
echo "2. Registriere einen Account (mit DEFAULT_ADMIN_EMAIL wirst du automatisch ADMIN)"
echo ""
echo "Nützliche Befehle:"
echo "  Status:  sudo systemctl status tribefinder"
echo "  Logs:    sudo journalctl -u tribefinder -f"
echo "  Updates: sudo su - tribefinder && cd TribeFinder && ./scripts/deploy-native.sh"
echo ""
