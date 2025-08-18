# 🐍 Server Backend - Modulare Python-Architektur

Das Backend des Agent-Systems basiert auf einer modularen Python-Architektur mit FastAPI, WebSocket-Support und einer Task-Engine für asynchrone Verarbeitung.

## 🏗️ Architektur-Übersicht

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   API       │───▶│  Task        │───▶│   Queen    │───▶│   Ollama    │
│ (FastAPI)   │    │  Engine      │    │   Agent    │    │   LLM       │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ WebSocket   │    │ Event        │    │ Streaming   │
│ Manager     │    │ Manager      │    │ Pipeline    │
└─────────────┘    └──────────────┘    └─────────────┘
```

## 📁 Modulstruktur

```
server/
├── README.md                 # Diese Datei
├── main.py                   # Server-Entrypoint & Uvicorn-Konfiguration
├── api.py                    # FastAPI-App & WebSocket-Endpoints
├── config.py                 # Konfigurationsverwaltung
├── core.py                   # WebSocket-Connection-Manager
├── requirements.txt          # Python-Dependencies
├── tasks/                    # Task-Engine-System
│   ├── __init__.py          # Paket-Exporte
│   ├── base.py              # Task-Basisklassen & Interfaces
│   ├── engine.py             # Task-Engine & Event-Manager
│   ├── message_tasks.py      # Nachrichten-spezifische Tasks
│   └── console_worker.py     # Console-Output & Monitoring
└── agents/                   # KI-Agent-System
    ├── __init__.py           # Paket-Exporte
    ├── base_agent.py         # Agent-Basisklassen & Models
    ├── ollama_agent.py       # Ollama-API-Integration
    ├── queen_agent.py        # Haupt-Chat-Agent (Singleton)
    ├── test_agent.py         # Agent-Unit-Tests
    ├── test_queen.py         # Queen-Unit-Tests
    ├── queen_example.py      # Verwendungsbeispiele
    └── streaming_chat_task.py # Streaming-Chat-Implementation
```

## 🔧 Kernkomponenten

### **1. main.py - Server-Entrypoint**
```python
# Server-Start mit Uvicorn
if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=9797, reload=True)
```

**Verantwortlichkeiten:**
- Logging-Konfiguration
- Uvicorn-Server-Start
- Konfiguration laden
- Fehlerbehandlung

### **2. api.py - FastAPI-Application**
```python
# WebSocket-Endpoint für Chat
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    # Nachrichtenverarbeitung...
```

**Verantwortlichkeiten:**
- FastAPI-App-Erstellung
- HTTP-Endpunkte (`/chat`, `/chat/stream`)
- WebSocket-Verbindungsverwaltung
- Nachrichten-Routing

### **3. core.py - WebSocket-Manager**
```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
```

**Verantwortlichkeiten:**
- WebSocket-Verbindungsverwaltung
- Client-Lifecycle-Management
- Nachrichtenverteilung

### **4. config.py - Konfigurationsverwaltung**
```python
class ServerConfig(BaseSettings):
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=9797)
    reload: bool = Field(default=True)
    log_level: str = Field(default="INFO")
```

**Verantwortlichkeiten:**
- Umgebungsvariablen-Management
- Server-Konfiguration
- Logging-Einstellungen

## 🚀 Task-Engine-System

### **Architektur**
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   API       │───▶│  Event       │───▶│   Task     │
│ (Input)     │    │  Manager     │    │   Engine   │
└─────────────┘    └──────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌──────────────┐    ┌─────────────┐
                   │ Message      │    │ Worker     │
                   │ Queue        │    │ Threads    │
                   └──────────────┘    └─────────────┘
```

### **Komponenten**

#### **GlobalEventManager**
```python
class GlobalEventManager:
    def __init__(self):
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.message_handlers: Dict[str, Callable] = {}
        self.running = False
    
    async def start(self):
        self.running = True
        asyncio.create_task(self._message_worker())
```

**Verantwortlichkeiten:**
- Nachrichten-Queue-Management
- Handler-Registrierung
- Asynchrone Nachrichtenverarbeitung

#### **TaskEngine**
```python
class TaskEngine:
    def __init__(self, max_workers: int = 4, queue_size: int = 1000):
        self.task_queue: PriorityQueue = PriorityQueue(maxsize=queue_size)
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.running_tasks: Dict[str, BaseTask] = {}
```

**Verantwortlichkeiten:**
- Task-Prioritätsverwaltung
- Worker-Thread-Management
- Task-Lifecycle-Management

#### **Message Tasks**
```python
class ChatMessageTask(BaseTask):
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        # Queen für Chat-Antwort verwenden
        queen = await get_queen_instance()
        response = await queen.chat_response(...)
        return TaskOutput(result=response, success=True)
```

**Verantwortlichkeiten:**
- Nachrichten-spezifische Verarbeitung
- Queen-Agent-Integration
- Fehlerbehandlung

## 🤖 Agent-System

### **Architektur**
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Queen     │───▶│   Ollama     │───▶│   Ollama    │
│   Agent     │    │   Agent      │    │   Server    │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐    ┌──────────────┐
│ Memory      │    │ HTTP API     │
│ System      │    │ Client       │
└─────────────┘    └──────────────┘
```

### **Komponenten**

#### **BaseAgent (Abstract)**
```python
class BaseAgent(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str, **kwargs) -> AgentResponse:
        pass
    
    @abstractmethod
    async def generate_response_stream(self, prompt: str, **kwargs) -> AsyncIterator[StreamChunk]:
        pass
```

**Verantwortlichkeiten:**
- Agent-Interface-Definition
- Gemeinsame Funktionalität
- Streaming-Support

#### **OllamaAgent**
```python
class OllamaAgent(BaseAgent):
    def __init__(self, config: OllamaConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def generate_response_stream(self, prompt: str, **kwargs) -> AsyncIterator[StreamChunk]:
        async for chunk in self._stream_from_ollama(prompt, **kwargs):
            yield StreamChunk(content=chunk.content, done=chunk.done)
```

**Verantwortlichkeiten:**
- Ollama-HTTP-API-Integration
- Streaming-Response-Verarbeitung
- Session-Management

#### **QueenAgent (Singleton)**
```python
class QueenAgent(BaseAgent):
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def chat_response_stream_websocket(self, user_message: str, **kwargs):
        # WebSocket-Streaming-Integration
        pass
```

**Verantwortlichkeiten:**
- Zentraler Chat-Agent
- Memory-Management
- WebSocket-Streaming-Integration

## 📡 API-Endpunkte

### **HTTP-Endpunkte**

#### **GET /** - API-Übersicht
```json
{
  "message": "Chat Backend API",
  "version": "1.0.0",
  "endpoints": {
    "chat": "/chat",
    "chat_stream": "/chat/stream",
    "websocket": "/ws/{client_id}",
    "docs": "/docs"
  }
}
```

#### **POST /chat** - Normale Chat-Antwort
```json
{
  "content": "Hallo, wie kann ich helfen?",
  "user_id": "user123"
}
```

#### **POST /chat/stream** - Streaming-Chat-Antwort
```json
{
  "content": "Erzähle mir eine Geschichte",
  "user_id": "user123"
}
```

### **WebSocket-Endpunkte**

#### **WS /ws/{client_id}** - Chat-Verbindung
```json
// Client → Server
{
  "type": "stream_request",
  "content": "Hallo"
}

// Server → Client (Streaming)
{"type": "streaming_start", "streamId": "stream_123"}
{"type": "streaming_token", "streamId": "stream_123", "content": "H"}
{"type": "streaming_token", "streamId": "stream_123", "content": "a"}
{"type": "streaming_end", "streamId": "stream_123"}
```

## 🔄 Streaming-Implementation

### **Streaming-Pipeline**
```python
async def handle_streaming_chat_message(websocket: WebSocket, client_id: str, message_data: dict):
    # 1. Streaming starten
    start_message = {"type": "streaming_start", "streamId": stream_id}
    await websocket.send_text(json.dumps(start_message))
    
    # 2. Queen-Streaming verwenden
    async for chunk in queen.chat_response_stream(...):
        token_message = {"type": "streaming_token", "content": chunk.content}
        await websocket.send_text(json.dumps(token_message))
    
    # 3. Streaming beenden
    end_message = {"type": "streaming_end"}
    await websocket.send_text(json.dumps(end_message))
```

### **Fallback-Mechanismus**
```python
try:
    # Streaming versuchen
    async for chunk in queen.chat_response_stream(...):
        # Token senden...
except Exception as stream_error:
    # Fallback: Normale Antwort
    response = await queen.chat_response(...)
    normal_message = {"type": "message", "content": response["response"]}
    await websocket.send_text(json.dumps(normal_message))
```

## 🧪 Testing

### **Unit-Tests**
```bash
# Agent-Tests
python3 -m agents.test_agent
python3 -m agents.test_queen

# Task-Tests
python3 -m tasks.test_engine
```

### **Integration-Tests**
```bash
# Queen-Beispiele
python3 -m agents.queen_example

# Streaming-Tests
python3 -c "
import asyncio
from agents.queen_agent import get_queen_instance

async def test_streaming():
    queen = await get_queen_instance()
    async for chunk in queen.chat_response_stream('Test'):
        print(f'Token: {chunk.content}')

asyncio.run(test_streaming())
"
```

### **API-Tests**
```bash
# HTTP-Endpoints
curl -X POST http://localhost:9797/chat \
  -H "Content-Type: application/json" \
  -d '{"content": "Hallo", "user_id": "test"}'

# WebSocket (mit wscat)
wscat -c ws://localhost:9797/ws/test
```

## 🔍 Debugging & Monitoring

### **Logging**
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Komponenten-spezifische Logger
logger = logging.getLogger(__name__)
logger.info("Nachricht verarbeitet")
```

### **Console Worker**
```python
# Task-Statistiken anzeigen
console_worker.print_stats()

# Queue-Status
console_worker.print_queue_status(queue_size, running_tasks)
```

### **Health Checks**
```bash
# Server-Status
curl http://localhost:9797/health

# Ollama-Status
curl http://localhost:11434/api/tags
```

## 🚀 Performance & Skalierung

### **Task-Engine-Optimierung**
```python
# Worker-Threads anpassen
task_engine = TaskEngine(max_workers=8, queue_size=2000)

# Prioritäten setzen
task = ChatMessageTask(message_event, priority=TaskPriority.HIGH)
```

### **WebSocket-Management**
```python
# Verbindungslimits
MAX_CONNECTIONS = 1000
if len(manager.active_connections) >= MAX_CONNECTIONS:
    await websocket.close(code=1013)  # Try again later
```

### **Memory-Management**
```python
# Agent-Memory begrenzen
MAX_MEMORY_SIZE = 1000
if len(self.memory) > MAX_MEMORY_SIZE:
    self.memory = self.memory[-MAX_MEMORY_SIZE:]
```

## 🔮 Erweiterungen

### **Neue Agent-Typen**
```python
class CustomAgent(BaseAgent):
    async def generate_response(self, prompt: str, **kwargs) -> AgentResponse:
        # Eigene Implementierung
        pass

# Registrieren
queen.add_agent("custom", CustomAgent())
```

### **Neue Task-Typen**
```python
class CustomTask(BaseTask):
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        # Eigene Task-Logik
        pass

# Factory erweitern
MessageTaskFactory.register_task("custom", CustomTask)
```

### **Neue API-Endpunkte**
```python
@app.post("/custom")
async def custom_endpoint(request: dict):
    # Eigener Endpoint
    pass
```

## 📝 Best Practices

### **Error Handling**
```python
try:
    result = await risky_operation()
except SpecificException as e:
    logger.error(f"Spezifischer Fehler: {e}")
    return error_response(e)
except Exception as e:
    logger.error(f"Unerwarteter Fehler: {e}")
    return generic_error_response()
```

### **Async/Await**
```python
# Korrekt: Async-Funktionen verwenden
async def process_message(message: str):
    result = await agent.process(message)
    return result

# Falsch: Blocking-Operationen in async-Funktionen
async def process_message(message: str):
    result = agent.process(message)  # Blocking!
    return result
```

### **Resource Management**
```python
# Mit Context Manager
async with aiohttp.ClientSession() as session:
    async with session.post(url, json=data) as response:
        return await response.json()

# Oder explizit aufräumen
session = aiohttp.ClientSession()
try:
    # Session verwenden
    pass
finally:
    await session.close()
```

---

**Entwickelt für modulare, skalierbare Backend-Architekturen**
