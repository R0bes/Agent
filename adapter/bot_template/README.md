# Bot Template

Dieser Ordner enthält alle Template-Dateien für die Erstellung neuer Bot-Implementierungen.

## Verfügbare Templates

### 1. `bot_interface.py`
Das zentrale Interface, das alle Bot-Implementierungen implementieren müssen. Definiert:
- Abstrakte Basisklasse `BotInterface`
- FastAPI-Wrapper für HTTP-API
- Bot-Factory für die Erstellung von Bot-Instanzen
- Gemeinsame Datenmodelle und Enums

### 2. `requirements.txt`
Alle Python-Abhängigkeiten, die für die Bot-Implementierungen benötigt werden:
- FastAPI und Uvicorn für die HTTP-API
- Selenium für WhatsApp Web-Automation
- python-telegram-bot für Telegram-Integration
- Weitere Hilfsbibliotheken

### 3. `Dockerfile.template`
Template für Docker-Images. Enthält Platzhalter:
- `{{ BOT_TYPE }}` - Der Typ des Bots (z.B. whatsapp, telegram)
- `{{ API_PORT }}` - Der Port für die API

### 4. `config.toml.template`
Template für Konfigurationsdateien. Enthält Platzhalter:
- `{{ BOT_TYPE }}` - Der Typ des Bots
- `{{ API_PORT }}` - Der Port für die API

### 5. `example_usage.py`
Beispiel für die Verwendung der Bot-Interface-API.

## Verwendung der Templates

### Neuen Bot erstellen

1. **Ordnerstruktur anlegen:**
   ```
   adapter/
   ├── bot_template/          # Diese Templates
   ├── mein_neuer_bot/       # Neuer Bot-Ordner
   │   ├── mein_neuer_bot_interface.py
   │   ├── Dockerfile
   │   ├── config.toml
   │   └── README.md
   ```

2. **Dockerfile erstellen:**
   ```bash
   cp adapter/bot_template/Dockerfile.template adapter/mein_neuer_bot/Dockerfile
   # Platzhalter ersetzen: {{ BOT_TYPE }} -> mein_neuer_bot, {{ API_PORT }} -> 8003
   ```

3. **Konfiguration erstellen:**
   ```bash
   cp adapter/bot_template/config.toml.template adapter/mein_neuer_bot/config.toml
   # Platzhalter ersetzen
   ```

4. **Bot-Interface implementieren:**
   ```python
   from adapter.bot_template.bot_interface import BotInterface
   
   class MeinNeuerBotInterface(BotInterface):
       # Alle abstrakten Methoden implementieren
       pass
   ```

5. **In Bot-Factory eintragen:**
   ```python
   # In bot_interface.py, BotFactory erweitern
   elif bot_type.lower() == "mein_neuer_bot":
       from adapter.mein_neuer_bot.mein_neuer_bot_interface import MeinNeuerBotInterface
       return MeinNeuerBotInterface(config=config)
   ```

### Docker Compose erweitern

```yaml
# In docker-compose.yml hinzufügen
mein-neuer-bot:
  container_name: mein-neuer-bot
  build:
    context: .
    dockerfile: adapter/mein_neuer_bot/Dockerfile
  environment:
    - BOT_TYPE=mein_neuer_bot
    - API_HOST=0.0.0.0
    - API_PORT=8003
  ports:
    - "8003:8003"
  volumes:
    - ./agent:/app/agent
    - ./adapter:/app/adapter
    - ./logs:/app/logs
  depends_on:
    - agent-core
  restart: unless-stopped
  networks:
    - agent-network
```

## Best Practices

1. **Interface implementieren:** Alle abstrakten Methoden aus `BotInterface` müssen implementiert werden
2. **Fehlerbehandlung:** Robuste Fehlerbehandlung für Netzwerk- und API-Fehler
3. **Logging:** Umfassendes Logging für Debugging und Monitoring
4. **Konfiguration:** Alle wichtigen Parameter über Konfigurationsdatei oder Umgebungsvariablen
5. **Docker:** Optimierte Docker-Images mit minimalen Abhängigkeiten
6. **API:** Konsistente HTTP-API-Endpunkte für alle Bot-Typen

## Unterstützte Bot-Typen

- **WhatsApp:** Über Selenium und WhatsApp Web
- **Telegram:** Über python-telegram-bot und Bot API
- **Erweiterbar:** Neue Bot-Typen können einfach hinzugefügt werden
