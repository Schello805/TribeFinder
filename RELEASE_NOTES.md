# TribeFinder - Release Notes (19. Januar 2026)

## 🎉 Hauptverbesserungen

### 1. Native Ubuntu Installation (empfohlen)
TribeFinder wird nativ betrieben. Die Installation ist einfacher, ressourcenschonender und besser für einzelne Server geeignet.

**Installation in 3 Schritten:**
```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
sudo ./scripts/setup-native.sh
```

**Vorteile:**
- ✅ Weniger RAM/CPU-Verbrauch
- ✅ Einfacheres Debugging
- ✅ Schnellere Entwicklung

### 2. Moderne UX
- **Toast Notifications** statt Browser-Alerts (15+ Stellen aktualisiert)
- **Skeleton Loader** für Gruppen & Events (bessere wahrgenommene Performance)
- **Error Boundary** verhindert White-Screen-of-Death

### 3. Verbesserte Sicherheit
- **Security Headers** (HSTS, X-Frame-Options, etc.)
- **Input Validation** via Zod in allen API-Routes
- **Rate Limiting** bereits vorhanden
- **Error Handling** global implementiert

### 4. Bessere Stabilität
- **Prisma Version-Konflikt** behoben (Ubuntu 24.04)
- **Alle Scripts** nutzen lokale Prisma-Version
- **Umfangreiche Dokumentation** für Troubleshooting

## 📚 Neue Dokumentation

- `INSTALL_NATIVE.md` - Vollständige native Installation
- `TROUBLESHOOTING.md` - Häufige Probleme & Lösungen
- `QUICKSTART.md` - 3-Schritte-Installation
- `MIGRATION.md` - Umzug / Migration
- `CHANGELOG.md` - Alle Änderungen

## 🔧 Wichtige Änderungen

### Prisma-Befehle
**ALT (funktioniert nicht mehr auf Ubuntu 24.04):**
```bash
npx prisma generate
npx prisma migrate deploy
```

**NEU (nutzt lokale Version):**
```bash
npm run db:generate
npm run db:migrate
```

### npm Scripts
```bash
npm run setup    # Automatisches Setup (nur einmal)
npm run deploy   # Updates einspielen
npm run db:studio # Prisma Studio öffnen
npm run db:backup # Datenbank-Backup
```

## 🚀 Deployment

### Für neue Installation
```bash
# 1. Repo klonen
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder

# 2. Setup ausführen
sudo ./scripts/setup-native.sh

# 3. Fertig! App läuft als systemd Service
```

### Für bestehende Installation (Update)
```bash
# Als tribefinder User
sudo su - tribefinder
cd ~/TribeFinder

# Updates holen und deployen
npm run deploy
```

## 🐛 Behobene Probleme

1. **Prisma 7.x Konflikt** - `npx prisma` installierte automatisch v7 (breaking changes)
2. **Browser-Alerts** - Alle durch moderne Toast Notifications ersetzt
3. **Loading States** - Skeleton Loader statt "Lädt..." Text
4. **Error Handling** - Globale Error Boundary verhindert Crashes

## ⚠️ Breaking Changes

Keine! Alle Änderungen sind abwärtskompatibel.

## 📋 Checkliste für Update

- [ ] Backup erstellen: `npm run db:backup`
- [ ] Repository pullen: `git pull`
- [ ] Dependencies installieren: `npm install`
- [ ] Datenbank migrieren: `npm run db:migrate`
- [ ] Build erstellen: `npm run build`
- [ ] Service neustarten: `sudo systemctl restart tribefinder`
- [ ] Status prüfen: `sudo systemctl status tribefinder`

## 🎯 Nächste Schritte (optional)

### Kurzfristig
- CSRF-Schutz für Formulare
- Infinite Scroll für Listen

### Mittelfristig
- E2E Tests mit Playwright
- Performance-Optimierung (ISR Caching)

### Langfristig
- PostgreSQL für Produktion
- CI/CD Pipeline

## 💬 Support

Bei Problemen:
1. Logs prüfen: `sudo journalctl -u tribefinder -f`
2. Troubleshooting Guide: `TROUBLESHOOTING.md`
3. GitHub Issues: https://github.com/Schello805/TribeFinder/issues

---

**Viel Erfolg mit TribeFinder! 💃**
