# LLM Provider Integration

Dieses Projekt unterstützt jetzt sowohl **Ollama** als auch **LM Studio** als LLM-Provider. Die Stubben-Implementierung wurde durch echte API-Integrationen ersetzt.

## Unterstützte Provider

### 1. Ollama
- **Standard-Port**: 11434
- **API-Endpunkt**: `/api/generate`
- **Unterstützte Features**: Text-Generierung, Streaming, Modell-Listing

### 2. LM Studio
- **Standard-Port**: 1234
- **API-Endpunkt**: `/v1/chat/completions`
- **Unterstützte Features**: Text-Generierung, Streaming, Modell-Listing

## Konfiguration

### Konfigurationsdatei (config.toml)

```toml
# LLM Configuration
# Provider options: "auto", "ollama", "lmstudio"
llm_provider = "auto"

# For Ollama (default port 11434)
llm_base_url = "http://localhost:11434"
llm_model = "gpt-oss:20b"

# For LM Studio (default port 1234)
# llm_base_url = "http://localhost:1234"
# llm_model = "gpt-oss:20b"
```

### Umgebungsvariablen

```bash
# Provider explizit setzen
export LLM_PROVIDER="ollama"  # oder "lmstudio"

# Base URL setzen
export LLM_BASE_URL="http://localhost:11434"

# Modell setzen
export LLM_MODEL="gpt-oss:20b"
```

### Automatische Erkennung

Wenn `llm_provider = "auto"` gesetzt ist, wird der Provider automatisch basierend auf dem Port erkannt:
- Port 11434 → Ollama
- Port 1234 → LM Studio
- Unbekannter Port → Standardmäßig Ollama

## Verwendung

### Grundlegende Verwendung

```python
from agent.llm_engine.handler import LLMHandler

# Handler mit automatischer Provider-Erkennung
handler = LLMHandler()

# Text generieren
response = await handler.generate("Hallo, wie geht es dir?", max_tokens=100)
print(response)
```

### Spezifischen Provider verwenden

```python
from agent.llm_engine.manager import llm_manager

# Direkt mit dem Manager
response = await llm_manager.generate(
    "Hallo, wie geht es dir?", 
    model_key="ollama:gpt-oss:20b",
    max_tokens=100
)

# Oder mit LM Studio
response = await llm_manager.generate(
    "Hallo, wie geht es dir?", 
    model_key="lmstudio:gpt-oss:20b",
    max_tokens=100
)
```

### Streaming verwenden

```python
# Streaming-Response
async for chunk in handler.stream_generate("Erzähle eine Geschichte", max_tokens=200):
    print(chunk, end="", flush=True)
```

## Setup der Provider

### Ollama Setup

1. **Ollama installieren**:
   ```bash
   # Windows (mit winget)
   winget install Ollama.Ollama
   
   # Oder von https://ollama.ai herunterladen
   ```

2. **Ollama starten**:
   ```bash
   ollama serve
   ```

3. **Modell herunterladen**:
   ```bash
   ollama pull gpt-oss:20b
   ```

4. **Testen**:
   ```bash
   python test_llm_providers.py ollama
   ```

### LM Studio Setup

1. **LM Studio installieren**:
   - Von https://lmstudio.ai herunterladen

2. **API-Server aktivieren**:
   - LM Studio öffnen
   - Zum "Local Server" Tab wechseln
   - "Start Server" klicken
   - Port 1234 sollte der Standard sein

3. **Modell laden**:
   - Modell in LM Studio laden
   - Modell-Name notieren (z.B. "gpt-oss:20b")

4. **Testen**:
   ```bash
   python test_llm_providers.py lmstudio
   ```

## Testen

### Automatischer Test

```bash
# Test mit aktueller Konfiguration
python test_llm_providers.py

# Test spezifischer Provider
python test_llm_providers.py ollama
python test_llm_providers.py lmstudio

# Test mit benutzerdefinierten Einstellungen
python test_llm_providers.py ollama http://localhost:11434 gpt-oss:20b
python test_llm_providers.py lmstudio http://localhost:1234 gpt-oss:20b

# Hilfe anzeigen
python test_llm_providers.py help
```

### Verfügbare Modelle auflisten

```python
from agent.llm_engine.manager import llm_manager

models = llm_manager.list_available_models()
print("Verfügbare Modelle:", models)
```

## Fehlerbehebung

### Häufige Probleme

1. **Verbindungsfehler**:
   - Prüfen Sie, ob der Provider läuft
   - Prüfen Sie die Base URL und den Port
   - Prüfen Sie Firewall-Einstellungen

2. **Modell nicht gefunden**:
   - Prüfen Sie den Modell-Namen
   - Stellen Sie sicher, dass das Modell geladen ist

3. **Port bereits belegt**:
   - Prüfen Sie, ob ein anderer Service den Port verwendet
   - Ändern Sie den Port in der Provider-Konfiguration

### Debug-Modus

```bash
# Debug-Modus aktivieren
export DEBUG=1
# oder
export AGENT_ENV=test
```

## API-Referenz

### LLMHandler

```python
class LLMHandler:
    def __init__(self, model_key: str = None)
    async def generate(prompt: str, **kwargs) -> str
    async def stream_generate(prompt: str, **kwargs) -> AsyncGenerator[str, None]
    async def check_connection() -> bool
```

### LLMManager

```python
class LLMManager:
    def get(model_key: str) -> LLMModel
    async def generate(prompt: str, model_key: str = None, **kwargs) -> str
    def register_model(model_key: str, model_instance)
    def list_available_models() -> List[str]
```

### Provider-spezifische Parameter

#### Ollama
- `max_tokens` → `num_predict`
- `temperature` → `temperature`
- `top_p` → `top_p`

#### LM Studio
- `max_tokens` → `max_tokens`
- `temperature` → `temperature`
- `top_p` → `top_p`
- `stream` → `stream`

## Migration von der Stubben-Implementierung

Die alten Stubben-Implementierungen wurden durch echte API-Integrationen ersetzt. Alle bestehenden Aufrufe sollten weiterhin funktionieren, aber jetzt mit echten LLM-Responses.

### Vorher (Stubben)
```python
# Alte Stubben-Implementierung
response = "This is a stub response"
```

### Nachher (Echte API)
```python
# Neue echte API-Integration
response = await llm_manager.generate("Your prompt here")
```

## Nächste Schritte

- [ ] OpenAI API-Integration hinzufügen
- [ ] Anthropic Claude-Integration hinzufügen
- [ ] Modell-Performance-Metriken
- [ ] Fallback-Mechanismen für Provider-Ausfälle
- [ ] Batch-Processing für mehrere Anfragen
