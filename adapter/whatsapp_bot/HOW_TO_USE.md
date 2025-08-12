# WhatsApp Bot - Verwendung

## 🚀 Schnellstart

### 1. Bot starten
```bash
python test_bot.py
```

### 2. QR-Code scannen
- Der Bot öffnet WhatsApp Web
- Ein QR-Code wird in einem Python-Dialogfenster angezeigt
- Scannen Sie den QR-Code mit Ihrem WhatsApp auf dem Handy
- Nach dem Scannen wird der Browser automatisch versteckt

### 3. Bot verwenden
Nach erfolgreicher Initialisierung können Sie folgende Befehle verwenden:

```
🤖 Bot-Befehl: help
📚 Verfügbare Befehle:
  send <nummer> <nachricht> - Nachricht senden
  status - Bot-Status anzeigen
  help - Diese Hilfe anzeigen
  quit/exit - Bot beenden

🤖 Bot-Befehl: send +49123456789 Hallo vom Bot!
📤 Sende Nachricht an +49123456789: Hallo vom Bot!
✅ Nachricht erfolgreich gesendet!

🤖 Bot-Befehl: status
📊 Bot Status: {'connected': True, 'monitoring': True, ...}

🤖 Bot-Befehl: quit
👋 Bot wird beendet...
```

## 📱 Nachrichten senden

### Format
```
send <telefonnummer> <nachricht>
```

### Beispiele
```
send +49123456789 Hallo! Das ist ein Test vom Bot.
send 49123456789 Wie geht es dir?
send +49 123 456789 Test Nachricht
```

**Wichtig:** Die Telefonnummer sollte im internationalen Format sein (mit +49 für Deutschland)

## 🔍 Bot-Status überprüfen

```
🤖 Bot-Befehl: status
```

Zeigt den aktuellen Status des Bots an:
- `connected`: Ist WhatsApp verbunden?
- `monitoring`: Läuft die Nachrichtenüberwachung?
- `last_activity`: Letzte Aktivität
- `error_count`: Anzahl der Fehler

## 🛑 Bot beenden

```
🤖 Bot-Befehl: quit
🤖 Bot-Befehl: exit
🤖 Bot-Befehl: q
```

## 🔧 Konfiguration

Der Bot kann mit verschiedenen Optionen konfiguriert werden:

```python
config = {
    'headless': False,        # Browser sichtbar (für QR-Code)
    'max_retries': 3,        # Maximale Wiederholungsversuche
    'retry_delay': 5,        # Wartezeit zwischen Versuchen
    'monitoring_interval': 3 # Überwachungsintervall in Sekunden
}
```

## 🚨 Fehlerbehebung

### Bot hängt beim Start
- Stellen Sie sicher, dass Chrome/Chromium installiert ist
- Überprüfen Sie die Internetverbindung
- Starten Sie den Bot neu

### QR-Code wird nicht angezeigt
- Der Bot läuft im sichtbaren Modus (`headless: False`)
- Überprüfen Sie, ob Tkinter und Pillow installiert sind
- Schauen Sie in die Konsole für Fehlermeldungen

### Nachrichten werden nicht gesendet
- Überprüfen Sie die Telefonnummer (internationales Format)
- Stellen Sie sicher, dass der Bot verbunden ist (`status` Befehl)
- Überprüfen Sie die Internetverbindung

### Browser bleibt sichtbar
- Der Bot versteckt den Browser automatisch nach dem Login
- Falls nicht, verwenden Sie den `status` Befehl
- Der Browser wird außerhalb des sichtbaren Bereichs positioniert

## 📁 Dateien

- `test_bot.py` - Haupttest-Skript
- `simple_whatsapp_bot.py` - Bot-Implementierung
- `example_usage.py` - Einfaches Beispiel
- `requirements.txt` - Python-Abhängigkeiten

## 🔗 Integration

Der Bot kann in größere Anwendungen integriert werden:

```python
from simple_whatsapp_bot import SimpleWhatsAppBot

# Bot erstellen
bot = SimpleWhatsAppBot(config={'headless': True})

# Initialisieren
await bot.initialize()

# Nachricht senden
success = await bot.send_message("+49123456789", "Hallo!")

# Nachrichtenüberwachung starten
await bot.start_monitoring()

# Bot beenden
await bot.close()
```

## 📞 Support

Bei Problemen:
1. Überprüfen Sie die Konsole für Fehlermeldungen
2. Verwenden Sie den `status` Befehl
3. Starten Sie den Bot neu
4. Überprüfen Sie die Internetverbindung
