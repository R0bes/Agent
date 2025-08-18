# 🚀 Agent - Modulares Chat-System mit KI-Integration

Ein vollständiges Chat-System mit modularem Backend, React-Frontend und KI-Agent-Integration. Das System unterstützt sowohl normale als auch Streaming-Chat-Antworten über WebSocket.

## 🏗️ Systemarchitektur

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React UI      │◄──────────────►│  Python Server  │
│   (Port 5173)   │                 │   (Port 9797)   │
└─────────────────┘                 └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   Ollama LLM    │
                                    │  (Port 11434)   │
                                    └─────────────────┘
```

## 🎯 Features

### **Backend (Python)**
- **FastAPI-Server** mit WebSocket-Unterstützung
- **Modulare Task-Engine** mit Prioritätswarteschlange
- **KI-Agent-System** (Queen Agent mit Ollama-Integration)
- **Streaming-Responses** Token für Token
- **Event-basierte Architektur** für Skalierbarkeit

### **Frontend (React)**
- **Moderne React 18+ UI** mit TypeScript
- **WebSocket-Integration** für Echtzeit-Kommunikation
- **Streaming-UI** mit live wachsenden Nachrichten
- **Responsive Design** für alle Geräte
- **Toggle zwischen normalen und Streaming-Modi**

### **KI-Integration**
- **Ollama-Integration** für lokale LLMs
- **Queen Agent** als zentraler Chat-Assistent
- **Streaming-Generierung** für bessere UX
- **Fallback-Mechanismus** bei Streaming-Fehlern

## 🚀 Quick Start

### **Voraussetzungen**
- Python 3.10+
- Node.js 18+
- Ollama (läuft auf Port 11434)

### **Installation & Start**

```bash
# 1. Repository klonen
git clone <repository-url>
cd Agent

# 2. Backend starten
cd server
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python3 main.py

# 3. Frontend starten (neues Terminal)
cd ui
npm install
npm run dev

# 4. Ollama starten (falls nicht läuft)
ollama serve
```

### **Zugriff**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:9797
- **API Docs**: http://localhost:9797/docs
- **Ollama**: http://localhost:11434

## 📁 Projektstruktur

```
Agent/
├── README.md                 # Diese Datei
├── .gitignore               # Git-Ignore-Regeln
├── Makefile                 # Build/Deploy-Automation
├── server/                  # Python Backend
│   ├── README.md           # Backend-Dokumentation
│   ├── main.py             # Server-Entrypoint
│   ├── api.py              # FastAPI + WebSocket
│   ├── config.py           # Konfiguration
│   ├── core.py             # WebSocket-Manager
│   ├── requirements.txt    # Python-Dependencies
│   ├── tasks/              # Task-Engine
│   │   ├── engine.py       # Task-Verarbeitung
│   │   ├── base.py         # Task-Basisklassen
│   │   └── message_tasks.py # Nachrichten-Tasks
│   └── agents/             # KI-Agenten
│       ├── base_agent.py   # Agent-Basisklassen
│       ├── ollama_agent.py # Ollama-Integration
│       └── queen_agent.py  # Haupt-Chat-Agent
└── ui/                     # React Frontend
    ├── README.md           # Frontend-Dokumentation
    ├── package.json        # Node.js-Dependencies
    ├── src/                # React-Quellcode
    │   ├── components/     # React-Komponenten
    │   ├── config/         # Konfiguration
    │   └── App.tsx         # Haupt-App
    └── public/             # Statische Assets
```

## 🔧 Entwicklung

### **Backend-Entwicklung**
```bash
cd server
# Auto-Reload aktiviert (Standard)
python3 main.py

# Tests ausführen
python3 -m agents.test_agent
python3 -m agents.test_queen
```

### **Frontend-Entwicklung**
```bash
cd ui
# Development-Server
npm run dev

# Build für Produktion
npm run build

# Tests (falls konfiguriert)
npm test
```

### **Makefile-Targets**
```bash
# Beide Services starten
make up

# Einzeln starten
make server_up
make ui_up

# Beide stoppen
make down

# Aufräumen
make clean
```

## 📡 API-Endpunkte

### **HTTP-Endpunkte**
- `GET /` - API-Übersicht
- `POST /chat` - Normale Chat-Antwort
- `POST /chat/stream` - Streaming-Chat-Antwort

### **WebSocket-Endpunkte**
- `WS /ws/{client_id}` - Chat-Verbindung

### **Nachrichtentypen**
- `message` - Normale Chat-Nachricht
- `stream_request` - Streaming-Chat-Anfrage
- `ping` - Verbindungstest
- `status` - Status-Anfrage

## 🔄 Streaming-Protokoll

### **Streaming-Nachrichten**
1. **`streaming_start`** - Neue Streaming-Session
2. **`streaming_token`** - Einzelne Token (wiederholt)
3. **`streaming_end`** - Streaming beenden

### **Beispiel-Stream**
```json
{"type": "streaming_start", "streamId": "stream_123", "timestamp": "..."}
{"type": "streaming_token", "streamId": "stream_123", "content": "H", "timestamp": "..."}
{"type": "streaming_token", "streamId": "stream_123", "content": "a", "timestamp": "..."}
{"type": "streaming_token", "streamId": "stream_123", "content": "l", "timestamp": "..."}
{"type": "streaming_end", "streamId": "stream_123", "timestamp": "..."}
```

## 🧪 Testing

### **Backend-Tests**
```bash
cd server
# Agent-Tests
python3 -m agents.test_agent
python3 -m agents.test_queen

# Beispiele
python3 -m agents.queen_example
```

### **Frontend-Tests**
```bash
cd ui
npm test
```

## 🔍 Debugging

### **Backend-Logs**
```bash
cd server
tail -f server.log
```

### **Frontend-DevTools**
- Browser DevTools öffnen
- WebSocket-Tab für Nachrichtenverfolgung
- Console für JavaScript-Logs

### **Ollama-Status**
```bash
curl http://localhost:11434/api/tags
```

## 🚀 Deployment

### **Produktions-Build**
```bash
# Frontend
cd ui
npm run build

# Backend
cd server
pip install -r requirements.txt
python3 main.py
```

### **Docker (geplant)**
```bash
# Docker-Compose wird implementiert
docker-compose up -d
```

## 🤝 Beitragen

1. **Fork** das Repository
2. **Feature-Branch** erstellen (`git checkout -b feature/amazing-feature`)
3. **Commit** deine Änderungen (`git commit -m 'Add amazing feature'`)
4. **Push** zum Branch (`git push origin feature/amazing-feature`)
5. **Pull Request** erstellen

## 📝 Changelog

### **v1.0.0** - Initial Release
- ✅ Modulares Backend mit FastAPI
- ✅ React-Frontend mit TypeScript
- ✅ WebSocket-Integration
- ✅ Ollama-LLM-Integration
- ✅ Streaming-Responses
- ✅ Task-Engine-Architektur

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe `LICENSE` für Details.

## 🆘 Support

- **Issues**: GitHub Issues verwenden
- **Discussions**: GitHub Discussions für Fragen
- **Wiki**: Projekt-Wiki für detaillierte Dokumentation

---

**Entwickelt mit ❤️ für modulare, skalierbare Chat-Systeme**
