# Agent FastAPI Application

Diese FastAPI-Anwendung ist ein Wrapper für die bestehende Agent-Python-Anwendung und bietet REST-API-Endpunkte für die Agent-Funktionalität.

## Installation

1. Installiere die Abhängigkeiten:
```bash
pip install -r requirements.txt
```

## Verwendung

### Server starten

```bash
python -m agent.api.app
```

Der Server läuft dann auf `http://localhost:8000`

### API-Dokumentation

Die automatisch generierte API-Dokumentation ist verfügbar unter:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpunkte

### GET /health
Health-Check-Endpunkt, der den Status der Anwendung überprüft.

**Response:**
```json
{
  "status": "healthy",
  "agent_id": "uuid-string",
  "llm_connected": true,
  "tools_available": 3
}
```

### POST /think
Hauptendpunkt für die Verarbeitung von Benutzeranfragen.

**Request:**
```json
{
  "query": "Was bedeutet 'vegan'?",
  "allow_subtasks": true,
  "max_subtask_depth": 3
}
```

**Response:**
```json
{
  "result": "Vegan bedeutet eine Ernährungsweise...",
  "agent_id": "uuid-string",
  "query": "Was bedeutet 'vegan'?",
  "status": "completed"
}
```

### GET /
Root-Endpunkt mit API-Informationen.

**Response:**
```json
{
  "message": "Agent API is running",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "think": "/think"
  },
  "agent_id": "uuid-string"
}
```

## Testing

Führe die Tests aus, um zu überprüfen, ob alles funktioniert:

```bash
python test_api.py
```

## Beispiel-Curl-Befehle

### Health Check
```bash
curl http://localhost:8000/health
```

### Think Request
```bash
curl -X POST http://localhost:8000/think \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Was bedeutet vegan?",
    "allow_subtasks": true,
    "max_subtask_depth": 2
  }'
```

## Konfiguration

Die Anwendung verwendet die bestehende Agent-Konfiguration. Stelle sicher, dass:
- Der LLM-Server (Ollama) läuft, falls du echte LLM-Antworten möchtest
- Alle erforderlichen Abhängigkeiten installiert sind

## Logging

Die Anwendung verwendet `agent.utils.log` für strukturiertes Logging (Dateien unter `logs/`).
