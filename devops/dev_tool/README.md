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

Nach der Installation kannst du das Tool mit `agent` oder `a` aufrufen:

```bash
# Interaktives Control-Menü
agent con
# oder
a con

# Status anzeigen
agent status
```

## Befehle

### `agent con` / `agent control`

Öffnet ein interaktives Menü zum Steuern aller Services:

- **Backend** starten/stoppen
- **Frontend** starten/stoppen
- **Infrastructure** (Docker Services) starten/stoppen
- **Alle Services** stoppen
- **Status** aktualisieren

### `agent status`

Zeigt den aktuellen Status aller Services an:
- Backend (Port 3001)
- Frontend (Port 5173)
- Infrastructure Services (Postgres, Redis, Qdrant, NATS)

## Features

- ✅ Status-Prüfung für alle Services
- ✅ Port-Checks
- ✅ HTTP-Health-Checks
- ✅ Prozess-Erkennung
- ✅ Docker-Container-Status
- ✅ Interaktives Menü mit Rich-UI
- ✅ Start/Stop-Funktionalität für alle Komponenten

## Abhängigkeiten

- `requests` - HTTP-Status-Checks
- `rich` - Schöne Terminal-UI
- `psutil` - Prozess-Management

## Entwicklung

Das Tool ist als Python-Package strukturiert und kann mit `pip install -e .` installiert werden.

