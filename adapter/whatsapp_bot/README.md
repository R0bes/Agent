# WhatsApp Bot

Ein inoffizieller WhatsApp Bot für die Agent-Plattform, der Nachrichten empfangen und senden kann.

## Features

- ✅ Nachrichten empfangen und verarbeiten
- ✅ Nachrichten an Kontakte senden
- ✅ Integration mit dem Agent Core
- ✅ Automatische Nachrichtenüberwachung
- ✅ QR Code Login für WhatsApp Web

## Installation

### Option 1: Docker (Empfohlen)

```bash
# Alle Services starten (inkl. WhatsApp Bot)
docker-compose up -d

# Nur WhatsApp Bot starten
docker-compose up whatsapp-bot

# Logs anschauen
docker-compose logs -f whatsapp-bot
```

### Option 2: Lokale Installation

1. Installiere die Abhängigkeiten:
```bash
pip install -r requirements.txt
```

2. Stelle sicher, dass Chrome/Chromium installiert ist

3. Optional: Installiere ChromeDriver automatisch:
```bash
pip install webdriver-manager
```

## Verwendung

### Docker-Verwendung

```bash
# Bot starten
docker-compose up whatsapp-bot

# Mit Umgebungsvariablen
WHATSAPP_HEADLESS=false docker-compose up whatsapp-bot

# QR Code scannen (bei Headless=false)
# Browser wird im Container geöffnet, QR Code muss gescannt werden
```

### Lokale Verwendung

```python
import asyncio
from adapter.whatsapp_bot.simple_whatsapp_bot import SimpleWhatsAppBot
from agent.core import Core

async def main():
    # Konfiguration
    config = {
        'headless': False,  # True für Headless Mode
        'max_retries': 3,
        'retry_delay': 5,
        'monitoring_interval': 3
    }
    
    # Erstelle Agent Core
    agent_core = Core()
    
    # Erstelle WhatsApp Bot
    bot = SimpleWhatsAppBot(agent_core=agent_core, config=config)
    
    # Initialisiere Bot
    await bot.initialize()
    
    # Setze Message Handler
    bot.set_message_handler(bot.process_incoming_message)
    
    # Starte Monitoring
    await bot.start_monitoring()
    
    # Warte...
    await asyncio.sleep(60)
    
    # Beende Bot
    await bot.close()

asyncio.run(main())
```

### Nachricht senden

```python
# Nachricht an Telefonnummer senden
await bot.send_message("+49123456789", "Hallo!")

# Nachricht an Kontakt senden
await bot.send_message_to_contact("Max Mustermann", "Hallo Max!")
```

## Konfiguration

### Docker-Umgebungsvariablen

```bash
# docker-compose.yml oder Umgebung
WHATSAPP_HEADLESS=true          # Headless Mode (true/false)
WHATSAPP_MAX_RETRIES=5          # Maximale Wiederholungen
WHATSAPP_RETRY_DELAY=5          # Wartezeit zwischen Wiederholungen (Sekunden)
WHATSAPP_MONITORING_INTERVAL=3  # Monitoring-Intervall (Sekunden)
```

### Lokale Browser-Optionen

Du kannst die Browser-Optionen in der `initialize()` Methode anpassen:

```python
options = webdriver.ChromeOptions()
options.add_argument("--headless")  # Headless Mode
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
```

### Timeout-Einstellungen

```python
# QR Code Timeout (Standard: 300 Sekunden)
await bot._wait_for_login(timeout=300)

# Monitoring-Intervall (Standard: 3 Sekunden)
await asyncio.sleep(3)
```

## Sicherheitshinweise

⚠️ **Wichtig**: Dieser Bot verwendet eine inoffizielle WhatsApp Web API. Beachte:

1. **Nutzungsbedingungen**: Verstoß gegen WhatsApp's ToS möglich
2. **Account-Sperre**: Risiko der Account-Sperre bei übermäßiger Nutzung
3. **Datenschutz**: Behandle Nachrichten vertraulich
4. **Rate Limiting**: Begrenze die Anzahl der Nachrichten

## Troubleshooting

### ChromeDriver Fehler

```bash
# Automatische ChromeDriver Installation
pip install webdriver-manager
```

### QR Code wird nicht gescannt

1. Stelle sicher, dass WhatsApp auf deinem Handy aktiv ist
2. Überprüfe die Internetverbindung
3. Versuche es erneut nach einigen Minuten

### Nachrichten werden nicht empfangen

1. Überprüfe die CSS-Selektoren (WhatsApp Web ändert sich regelmäßig)
2. Stelle sicher, dass der Bot verbunden ist
3. Überprüfe die Logs für Fehlermeldungen

## Entwicklung

### CSS-Selektoren aktualisieren

WhatsApp Web ändert regelmäßig seine Struktur. Falls der Bot nicht funktioniert, überprüfe und aktualisiere die CSS-Selektoren:

```python
# Aktuelle Selektoren (Stand: 2024)
'[data-testid="chat-list"]'  # Chat-Liste
'[data-testid="conversation-compose-box-input"]'  # Input-Feld
'[data-testid="send"]'  # Senden-Button
'[data-testid="icon-unread-count"]'  # Ungelesene Nachrichten
```

### Logs aktivieren

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Lizenz

Dieser Bot ist für Bildungs- und Entwicklungszwecke gedacht. Verwende ihn verantwortungsvoll und respektiere WhatsApp's Nutzungsbedingungen.
