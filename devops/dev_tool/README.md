# Agent Development Tool

Ein Python-basiertes Dev-Tool zur Steuerung und Verwaltung des Agent-Projekts.

## Installation

```bash
pip install -e .
```

Oder mit `pipx` für eine globale Installation:

```bash
pipx install -e .
```

## Verwendung

Nach der Installation kannst du das Tool mit `agent` aufrufen:

```bash
# Interaktives Menü (ohne Argumente)
agent

# Status anzeigen
agent status

# Services starten/stoppen
agent backend    # oder: agent be
agent frontend   # oder: agent fe
agent infra
agent all
```

## Befehle

### `agent` (ohne Argumente)

Öffnet ein interaktives Menü zum Steuern aller Services:

- **Backend** starten/stoppen
- **Frontend** starten/stoppen
- **Infrastructure** (Docker Services) starten/stoppen
- **Alle Services** starten/stoppen
- **Exit**

### `agent status`

Zeigt den aktuellen Status aller Services an:
- Backend (Port 3001)
- Frontend (Port 5174)
- Infrastructure Services (Postgres, Redis, Qdrant, NATS)

### `agent backend|be`

Startet oder stoppt den Backend-Service (Toggle).

### `agent frontend|fe`

Startet oder stoppt den Frontend-Service (Toggle).

### `agent infra`

Startet oder stoppt alle Infrastructure-Services (Toggle).

### `agent all`

Startet oder stoppt alle Services (Toggle).

## Features

- ✅ Status-Prüfung für alle Services (HTTP-Checks)
- ✅ Nicht-blockierende Log-Ausgabe (CLI bleibt bedienbar)
- ✅ Docker-Container-Status
- ✅ Interaktives Menü mit Rich-UI
- ✅ Start/Stop-Funktionalität für alle Komponenten
- ✅ Zentrale Port-Konfiguration (hardcoded)

## Abhängigkeiten

- `requests` - HTTP-Status-Checks
- `rich` - Terminal-UI

## Entwicklung

Das Tool ist als Python-Package strukturiert und kann mit `pip install -e .` installiert werden.
