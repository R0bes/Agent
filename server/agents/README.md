# Agent-System

Dieses Verzeichnis enthält eine abstrakte Basisklasse für Agenten, eine konkrete Implementierung für Ollama-Local und eine erweiterte Queen-Implementierung als Singleton.

## Architektur

### BaseAgent (Abstrakte Basisklasse)

Die `BaseAgent`-Klasse definiert das gemeinsame Interface für alle Agenten im System:

- **Abstrakte Methoden:**
  - `initialize()`: Initialisiert den Agenten
  - `generate_response()`: Generiert Antworten auf Prompts
  - `health_check()`: Führt Gesundheitschecks durch

- **Gemeinsame Funktionalität:**
  - Konfigurationsverwaltung
  - Logging
  - Ressourcenbereinigung
  - Fehlerbehandlung

### OllamaAgent (Konkrete Implementierung)

Der `OllamaAgent` implementiert die abstrakte Basisklasse und kommuniziert mit einem lokalen Ollama-Server:

- **Features:**
  - HTTP-Kommunikation mit Ollama API
  - Unterstützung für verschiedene Modelle
  - Kontext-basierte Konversationen
  - Modell-Management (Liste, Download)
  - Konfigurierbare Parameter (Temperature, Max-Tokens, etc.)

### QueenAgent (Singleton-Implementierung)

Der `QueenAgent` erbt von `OllamaAgent` und implementiert das Singleton-Pattern:

- **Features:**
  - **Singleton-Pattern**: Garantiert nur eine Instanz
  - **Erweiterte Chat-Funktionalität**: Starten/Beenden von Konversationen
  - **Konversationserinnerung**: Behält Kontext über mehrere Nachrichten
  - **Antwortstile**: Verschiedene Persönlichkeiten (friendly, formal, casual)
  - **Kontext-Awareness**: Passt Antworten basierend auf Konversationsverlauf an
  - **Statistiken**: Verfolgt Konversationen und Antworten

## Verwendung

### Grundlegende Verwendung

```python
from agents.ollama_agent import OllamaAgent, OllamaConfig

# Konfiguration erstellen
config = OllamaConfig(
    name="my-assistant",
    model="llama2",
    temperature=0.7,
    system_prompt="Du bist ein hilfreicher Assistent."
)

# Agent erstellen und initialisieren
agent = OllamaAgent(config)
await agent.initialize()

# Antwort generieren
response = await agent.generate_response("Hallo! Wie geht es dir?")
print(response.content)

# Ressourcen bereinigen
await agent.cleanup()
```

### Mit Kontext

```python
# Kontext für eine Konversation
context = [
    {"role": "user", "content": "Hallo!"},
    {"role": "assistant", "content": "Hallo! Wie kann ich helfen?"}
]

# Antwort mit Kontext generieren
response = await agent.generate_response(
    "Erzähle mir eine Geschichte",
    context=context
)
```

### Queen-Agent Verwendung

```python
from agents.queen_agent import QueenAgent, QueenConfig, get_queen_instance

# Queen als Singleton verwenden
queen = await get_queen_instance()

# Konversation starten
welcome = await queen.start_conversation(
    user_id="user123",
    conversation_id="conv1"
)

# Chat-Antwort generieren
response = await queen.chat_response(
    "Hallo Queen! Wie geht es dir?",
    user_id="user123",
    conversation_id="conv1"
)

# Konversation beenden
farewell = await queen.end_conversation(
    user_id="user123",
    conversation_id="conv1"
)

# Queen-Status abrufen
status = queen.get_queen_status()
```

### Agent-Factory

```python
def create_agent(agent_type: str, **kwargs):
    if agent_type == "ollama":
        config = OllamaConfig(**kwargs)
        return OllamaAgent(config)
    # Weitere Agent-Typen hier hinzufügen

# Verschiedene Agenten erstellen
llama_agent = create_agent("ollama", name="llama", model="llama2")
code_agent = create_agent("ollama", name="code", model="codellama")
```

## Konfiguration

### OllamaConfig

- `name`: Name des Agenten
- `model`: Ollama-Modellname
- `temperature`: Kreativität (0.0 - 1.0)
- `max_tokens`: Maximale Anzahl Tokens
- `system_prompt`: System-Prompt für das Modell
- `timeout`: HTTP-Timeout in Sekunden
- `base_url`: Ollama-Server URL (Standard: http://localhost:11434)
- `stream`: Streaming-Modus aktivieren
- `format`: Antwortformat (z.B. "json")
- `options`: Zusätzliche Ollama-Optionen

### QueenConfig

- Alle Parameter von `OllamaConfig` plus:
- `default_system_prompt`: Standard-System-Prompt für die Queen
- `conversation_memory_size`: Anzahl der zu behaltenden Nachrichten
- `response_style`: Antwortstil (friendly, formal, casual)
- `enable_context_awareness`: Kontext-Awareness aktivieren/deaktivieren

## Voraussetzungen

- Python 3.8+
- Ollama-Server läuft lokal auf Port 11434
- Installierte Abhängigkeiten: `aiohttp`, `pydantic`

## Beispiele

- **Basis-Beispiele**: `python -m agents.example_usage`
- **Queen-Demonstration**: `python -m agents.queen_example`
- **Tests**: `python -m agents.test_agent`

## Erweiterung

Um neue Agent-Typen hinzuzufügen:

1. Erstellen Sie eine neue Klasse, die von `BaseAgent` erbt
2. Implementieren Sie alle abstrakten Methoden
3. Erstellen Sie eine spezifische Konfigurationsklasse (optional)
4. Fügen Sie den neuen Typ zur Factory hinzu

## Fehlerbehandlung

Alle Agenten verwenden die `AgentError`-Exception für einheitliche Fehlerbehandlung:

```python
try:
    response = await agent.generate_response("Prompt")
except AgentError as e:
    print(f"Agent-Fehler: {e}")
    if e.original_error:
        print(f"Ursprünglicher Fehler: {e.original_error}")
```
