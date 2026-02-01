# Migration / Umzug

Diese Datei beschreibt generelle Schritte, um TribeFinder auf einen neuen Server umzuziehen.

## Voraussetzungen

- Zielserver ist installiert (siehe `INSTALL_NATIVE.md`)
- PostgreSQL ist erreichbar und `DATABASE_URL` ist korrekt gesetzt

## Umzug

1. Erstelle auf dem Quellserver im Admin-Bereich ein Backup (`/admin/backups`).
2. Übertrage das Backup auf den Zielserver.
3. Stelle das Backup auf dem Zielserver wieder her (UI oder `scripts/restore-backup.sh`).
4. Starte den Service neu und führe `/admin/diagnostics` aus.
- [ ] Uploads gesichert
- [ ] .env gesichert
- [ ] Native Installation durchgeführt
- [ ] Datenbank wiederhergestellt
- [ ] Uploads wiederhergestellt
- [ ] Service läuft
- [ ] Website im Browser erreichbar
- [ ] Login funktioniert
- [ ] Uploads funktionieren
- [ ] Admin-Bereich zugänglich
