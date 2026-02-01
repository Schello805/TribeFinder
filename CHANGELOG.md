# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased] - 2026-01-19

## [Unreleased] - 2026-01-28

### 🧪 Tests

- Playwright E2E: Neuer Test für Inbox-Thread (Edit/Delete bis gelesen)

### 🔧 Geändert

- Event-Erstellung: Datum/Uhrzeit Eingabe UX überarbeitet (native Date/Time Picker, Safari-kompatibel)
- Event-Formular: Automatisches Setzen der Endzeit (+90 Minuten) solange Ende nicht manuell geändert wurde
- Event-Formular: Beim Bearbeiten wird das Ende beim Verschieben des Starts mitverschoben (inkl. Hinweis)
- Event-Formular: Inline-Validierung + Scroll zum ersten Fehler
- Event-Formular: Zeitzone aus dem Browser wird als Info angezeigt
- Formular-Layout: Ticket-Link/Preis unter Webseite neu angeordnet

#### SEO
- `robots.txt` und `sitemap.xml` werden jetzt server-seitig generiert (Next.js Metadata Routes)
- Sitemap nutzt bevorzugt `SITE_URL` (Fallback: `NEXTAUTH_URL`) als Basis
- Globales Default-SEO verbessert (Description, OpenGraph, Twitter Cards)

### 🐛 Behoben

- "Ungültiger Wert" bei Datum/Uhrzeit Eingabe in Safari (Browser-Validation der versteckten Inputs)
- Weiterleitung nach Event-Erstellung für Events ohne Gruppe
- Event löschen: Delete-Button auf Detailseite + API-Route für Events ohne Gruppe

### 🎉 Neu hinzugefügt

#### UX Verbesserungen
- **Toast Notifications System** - Moderne Benachrichtigungen statt Browser-Alerts
  - 4 Typen: success, error, warning, info
  - Auto-Dismiss nach 5 Sekunden
  - Manuelles Schließen möglich
  - Integriert in allen Formularen und User-Interaktionen
  
- **Skeleton Loader** - Loading-Platzhalter für bessere wahrgenommene Performance
  - Gruppen-Listenseite (`/groups`)
  - Event-Listenseite (`/events`)
  - Passt exakt zum finalen Layout (keine Layout-Shifts)

#### Stabilität & Fehlerbehandlung
- **Error Boundary** - Globale Fehlerbehandlung für React Components
  - Zeigt benutzerfreundliche Fehlermeldungen
  - Entwickler-Details nur in Development-Modus
  - "Seite neu laden" Button

#### Sicherheit
- **Security Headers** in `next.config.ts`
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy
  - Permissions-Policy

#### Installation & Deployment
- **Native Ubuntu LXC Installation**
  - Automatisches Setup-Script (`scripts/setup-native.sh`)
  - Deployment-Script (`scripts/deploy-native.sh`)
  - Systemd Service-Konfiguration
  - Vollständige Dokumentation in `INSTALL_NATIVE.md`

- **Troubleshooting Guide** (`TROUBLESHOOTING.md`)
  - Prisma Version-Konflikte
  - Service-Probleme
  - Datenbank-Probleme
  - Upload-Fehler

- **Weitere Dokumentation**
  - `QUICKSTART.md` - 3-Schritte-Installation
  - `MIGRATION.md` - Umzug / Migration

### 🔧 Geändert

#### Installation
- **Prisma-Befehle** - Nutzen jetzt npm scripts statt `npx prisma`
  - Verhindert automatische Installation von Prisma 7.x
  - Nutzt lokale Prisma 5.10.2 Version
  - Alle Scripts und Dokumentation aktualisiert

#### Gruppen-Seite
- Von Server Component zu Client Component konvertiert
- Implementiert Loading States mit `useState`/`useEffect`
- Zeigt Skeleton Loader während des Ladens

### 🐛 Behoben

- **Prisma Version-Konflikt** auf Ubuntu 24.04
  - `npx prisma` installierte automatisch v7.2.0 (breaking changes)
  - Jetzt: `npm run db:generate` und `npm run db:migrate`
  
- **Alle Browser-Alerts ersetzt**
  - 15+ `alert()` Aufrufe durch Toast Notifications ersetzt
  - Betrifft: Gruppen, Events, Feed, Karte, Admin-Bereich

### 📝 Dokumentation

- README.md aktualisiert - Native Installation als Hauptoption
- OPTIMIZATIONS.md aktualisiert - Status aller Features
- Neue npm scripts: `npm run setup`, `npm run deploy`

### ✅ Validierung

- **Input Sanitization**: Bereits via Zod-Schemas in allen API-Routes implementiert
- **Rate Limiting**: Bereits vorhanden für kritische Endpoints
- **Magic Bytes Validation**: Bereits vorhanden für File-Uploads

---

## Nächste geplante Features

### Kurzfristig
- Input Sanitization in Frontend-Formularen aktivieren
- CSRF-Schutz für Formulare

### Mittelfristig
- Infinite Scroll für Gruppen/Events
- Favoriten/Bookmarks Feature
- Performance-Optimierung (ISR Caching)

### Langfristig
- E2E Tests mit Playwright
- Error Tracking (Sentry)
- PostgreSQL Migration für Produktion
- CI/CD Pipeline (GitHub Actions)

---

## Installation

### Native Installation (empfohlen)
```bash
git clone https://github.com/Schello805/TribeFinder.git
cd TribeFinder
sudo ./scripts/setup-native.sh
```

Siehe `INSTALL_NATIVE.md` für Details.

----

**Letzte Aktualisierung:** 19. Januar 2026
