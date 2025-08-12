# Bot Adapter

Dieser Ordner enthält alle Bot-Implementierungen und das einheitliche Bot-Interface für verschiedene Messaging-Plattformen.

## Struktur

```
adapter/
├── bot_template/           # Template-Dateien für neue Bot-Implementierungen
│   ├── bot_interface.py   # Zentrale Interface-Definition
│   ├── requirements.txt   # Python-Abhängigkeiten
│   ├── Dockerfile.template # Docker-Template
│   ├── config.toml.template # Konfigurations-Template
│   ├── example_usage.py   # Verwendungsbeispiel
│   └── README.md          # Template-Dokumentation
├── whatsapp_bot/          # WhatsApp Bot Implementierung
│   ├── whatsapp_bot_interface.py
│   ├── Dockerfile
│   ├── config.toml
│   └── README.md
├── telegram_bot/           # Telegram Bot Implementierung
│   ├── telegram_bot_interface.py
│   ├── Dockerfile
│   ├── config.toml
│   └── README.md
└── README.md               # Diese Datei
```

## Verfügbare Bot-Typen

### 1. WhatsApp Bot
- **Datei:** `whatsapp_bot/whatsapp_bot_interface.py`
- **Technologie:** Selenium WebDriver + WhatsApp Web
- **Features:**
  - QR-Code Login
  - Nachrichten senden/empfangen
  - Kontakt- und Telefonnummer-Support
  - Headless-Modus
  - Automatische Nachrichtenüberwachung
- **Port:** 8001
- **Dependencies:** Chrome/Selenium

### 2. Telegram Bot
- **Datei:** `telegram_bot/telegram_bot_interface.py`
- **Technologie:** python-telegram-bot + Bot API
- **Features:**
  - Bot Token Authentication
  - Webhook und Polling Support
  - Command Handler (/start, /help, /status)
  - Benutzer-Berechtigungen
  - Broadcast-Nachrichten
- **Port:** 8002
- **Dependencies:** python-telegram-bot

## Einheitliches Interface

Alle Bot-Implementierungen implementieren das `BotInterface` aus `bot_template/bot_interface.py`:

### Abstrakte Methoden
- `initialize()` - Bot initialisieren
- `send_message()` - Nachricht senden
- `start_monitoring()` - Nachrichtenüberwachung starten
- `stop_monitoring()` - Nachrichtenüberwachung stoppen
- `close()` - Bot schließen

### Gemeinsame Funktionalitäten
- `set_message_handler()` - Message Handler setzen
- `get_status()` - Bot-Status abrufen
- `is_healthy()` - Gesundheitsstatus prüfen
- `process_incoming_message()` - Eingehende Nachrichten verarbeiten

## FastAPI Integration

Jeder Bot wird über eine einheitliche HTTP-API verfügbar gemacht:

### Endpunkte
- `GET /` - Root-Informationen
- `GET /status` - Bot-Status
- `GET /health` - Gesundheitscheck
- `POST /send` - Nachricht senden
- `POST /webhook` - Webhook für eingehende Nachrichten
- `POST /start` - Bot starten
- `POST /stop` - Bot stoppen

### Verwendung
```python
from adapter.bot_template.bot_interface import BotFactory, FastAPIBotWrapper

# Bot erstellen
bot = BotFactory.create_bot("whatsapp", config)

# FastAPI Wrapper
api_wrapper = FastAPIBotWrapper(bot, host="0.0.0.0", port=8001)

# Bot initialisieren und API starten
await bot.initialize()
await api_wrapper.start()
```

## Docker Integration

Alle Bots sind für Docker optimiert und werden über die zentrale `docker-compose.yml` im Root-Verzeichnis verwaltet:

### Services
- `whatsapp-bot` - WhatsApp Bot auf Port 8001
- `telegram-bot` - Telegram Bot auf Port 8002
- `chrome` - Selenium Chrome für WhatsApp
- `nginx` - Reverse Proxy für alle Bot-APIs

### Umgebungsvariablen
```bash
# WhatsApp
WHATSAPP_HEADLESS=true
WHATSAPP_MAX_RETRIES=3
BOT_TYPE=whatsapp
API_PORT=8001

# Telegram
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_POLLING=true
BOT_TYPE=telegram
API_PORT=8002
```

## Neue Bot-Typen hinzufügen

1. **Template kopieren:**
   ```bash
   cp -r adapter/bot_template adapter/mein_neuer_bot
   ```

2. **Interface implementieren:**
   ```python
   from adapter.bot_template.bot_interface import BotInterface
   
   class MeinNeuerBotInterface(BotInterface):
       # Alle abstrakten Methoden implementieren
       pass
   ```

3. **In BotFactory eintragen:**
   ```python
   elif bot_type.lower() == "mein_neuer_bot":
       from adapter.mein_neuer_bot.mein_neuer_bot_interface import MeinNeuerBotInterface
       return MeinNeuerBotInterface(config=config)
   ```

4. **Docker Compose erweitern:**
   ```yaml
   mein-neuer-bot:
     build:
       context: .
       dockerfile: adapter/mein_neuer_bot/Dockerfile
     environment:
       - BOT_TYPE=mein_neuer_bot
       - API_PORT=8003
     ports:
       - "8003:8003"
   ```

## Konfiguration

### WhatsApp Bot
```toml
[whatsapp]
headless = true
qr_timeout = 300
max_retries = 3
retry_delay = 5
monitoring_interval = 3
```

### Telegram Bot
```toml
[telegram]
token = "your_bot_token"
polling = true
allowed_users = []
max_retries = 3
retry_delay = 5
```

## Entwicklung

### Lokale Ausführung
```bash
# WhatsApp Bot
cd adapter/whatsapp_bot
python whatsapp_bot_interface.py

# Telegram Bot
cd adapter/telegram_bot
python telegram_bot_interface.py
```

### Tests
```bash
# Bot-Interface testen
cd adapter/bot_template
python -m pytest test_bot_interface.py

# Spezifische Bot-Tests
cd adapter/whatsapp_bot
python test_whatsapp_bot.py
```

## Troubleshooting

### Häufige Probleme
1. **Chrome/Selenium Fehler:** Chrome-Version kompatibel machen
2. **Telegram Token:** Bot-Token überprüfen
3. **Port-Konflikte:** Ports in docker-compose.yml anpassen
4. **Import-Fehler:** PYTHONPATH korrekt setzen

### Logs
Alle Bots loggen in `./logs/`:
- `app.log` - Allgemeine Anwendungslogs
- `error.log` - Fehlerlogs

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

## Support

Bei Problemen oder Fragen:
1. Logs überprüfen
2. Docker-Container-Status prüfen
3. Konfigurationsdateien validieren
4. Issue im Repository erstellen
