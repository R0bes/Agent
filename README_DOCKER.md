# 🐳 Agent mit Docker Compose und Ollama

Dieser Guide erklärt, wie der Agent mit Docker Compose gestartet wird und dabei das GPT-OSS:20B Ollama Modell verwendet.

## 🚀 Schnellstart

### Option 1: Ollama als Docker Service (Empfohlen)

```bash
# Alle Services starten (inkl. Ollama)
docker-compose up -d

# Status überprüfen
docker-compose ps

# Logs anzeigen
docker-compose logs -f agent-core
```

### Option 2: Host-Ollama verwenden (Entwicklung)

```bash
# Nur Agent starten (verwendet Host-Ollama)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d agent-core

# Status überprüfen
docker-compose ps
```

## 📋 Services

### Ollama Service
- **Image**: `ollama/ollama:latest`
- **Port**: 11434
- **Volume**: `ollama_data` (persistente Modell-Speicherung)
- **Model**: `gpt-oss:20b` (wird automatisch heruntergeladen)

### Agent Core
- **Port**: 8000
- **LLM Provider**: Ollama
- **Model**: gpt-oss:20b
- **Abhängigkeit**: Ollama Service

### Weitere Services
- **UI**: Port 4001
- **WhatsApp Bot**: Port 8001
- **Telegram Bot**: Port 8002
- **Chrome**: Port 4444 (Selenium)
- **Nginx**: Port 80/443

## 🔧 Konfiguration

### Umgebungsvariablen

```yaml
environment:
  - LLM_PROVIDER=ollama
  - LLM_BASE_URL=http://ollama:11434  # Docker Service
  - LLM_MODEL=gpt-oss:20b
```

### Für Host-Ollama (Entwicklung)

```yaml
environment:
  - LLM_BASE_URL=http://host.docker.internal:11434
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## 📊 Monitoring

### Service-Status

```bash
# Alle Services
docker-compose ps

# Spezifischer Service
docker-compose ps agent-core

# Service-Logs
docker-compose logs -f ollama
docker-compose logs -f agent-core
```

### Ollama-Status

```bash
# Modell-Liste
curl http://localhost:11434/api/tags

# Server-Status
curl http://localhost:11434/api/version
```

## 🧪 Testing

### Agent testen

```bash
# API-Endpunkt testen
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Was ist 2+2?"}'
```

### LLM-Provider testen

```bash
# Im Container testen
docker exec -it core python test_llm_providers.py

# Oder direkt
docker exec -it core python -c "
from agent.core.core import Core
import asyncio
core = Core()
result = asyncio.run(core.ask('Hallo!'))
print(result)
"
```

## 🔄 Entwicklung

### Code-Änderungen

```bash
# Code wird automatisch neu geladen (Volume-Mount)
# Einfach Dateien bearbeiten und Container neu starten

# Container neu starten
docker-compose restart agent-core

# Oder neu bauen
docker-compose up -d --build agent-core
```

### Debug-Modus

```bash
# Debug-Logs aktivieren
docker-compose up -d --build agent-core
docker-compose logs -f agent-core
```

## 🚨 Troubleshooting

### Häufige Probleme

#### 1. Ollama startet nicht
```bash
# Logs überprüfen
docker-compose logs ollama

# Container neu starten
docker-compose restart ollama
```

#### 2. Agent kann Ollama nicht erreichen
```bash
# Netzwerk-Status
docker network ls
docker network inspect agent-network

# Ollama-Container erreichen
docker exec -it core ping ollama
```

#### 3. Modell nicht verfügbar
```bash
# Modell manuell herunterladen
docker exec -it ollama ollama pull gpt-oss:20b

# Modell-Liste
docker exec -it ollama ollama list
```

### Logs analysieren

```bash
# Alle Logs
docker-compose logs

# Spezifische Fehler
docker-compose logs agent-core | grep ERROR
docker-compose logs ollama | grep ERROR
```

## 📈 Performance

### Ressourcen-Monitoring

```bash
# Container-Ressourcen
docker stats

# Spezifischer Container
docker stats ollama
docker stats agent-core
```

### Optimierungen

- **Ollama**: GPU-Support aktivieren (falls verfügbar)
- **Agent**: Memory-Limits anpassen
- **Netzwerk**: Inter-Container-Kommunikation optimieren

## 🔐 Sicherheit

### Netzwerk-Isolation

- Alle Services laufen im `agent-network`
- Ollama ist nur intern erreichbar
- Externe Ports sind minimiert

### Volume-Sicherheit

- Ollama-Daten sind persistent
- Code-Volumes sind read-only (außer Entwicklung)

## 📚 Weitere Informationen

- [Ollama Docker Hub](https://hub.docker.com/r/ollama/ollama)
- [Docker Compose Dokumentation](https://docs.docker.com/compose/)
- [Agent LLM Engine](../agent/llm_engine/README.md)
