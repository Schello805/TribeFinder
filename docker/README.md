# Docker-Dateien (Optional)

Dieser Ordner enthält die Docker-Konfigurationsdateien für TribeFinder.

**Hinweis:** Für die meisten Anwendungsfälle empfehlen wir die **native Installation** (siehe `../INSTALL_NATIVE.md`).

## Dateien

- `Dockerfile` - Container-Image für TribeFinder
- `docker-compose.prod.yml` - Production Setup mit PostgreSQL
- `docker-compose.dev.yml` - Development Setup
- `.dockerignore` - Dateien die nicht ins Image kopiert werden

## Verwendung

Siehe `../DOCKER.md` für die vollständige Anleitung.

**Kurzversion:**

```bash
# Zurück ins Hauptverzeichnis
cd ..

# Production Setup
docker compose -f docker/docker-compose.prod.yml up -d --build

# Development Setup
docker compose -f docker/docker-compose.dev.yml up -d
```

## Wann Docker nutzen?

Docker ist sinnvoll für:
- Multi-Service-Setups mit mehreren Containern
- Isolierte Entwicklungsumgebungen
- Wenn du bereits Docker-Infrastruktur nutzt
- Komplexe Deployment-Szenarien

Für einfache Ubuntu LXC Container ist die native Installation meist besser.
