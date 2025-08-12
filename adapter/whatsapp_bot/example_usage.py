"""
Beispiel für die Verwendung des WhatsApp Bots
"""

import asyncio
import sys
import os
import asyncio

# Füge den Projektpfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from adapter.whatsapp_bot.simple_whatsapp_bot import SimpleWhatsAppBot
from agent.core import Core

async def main():
    """Hauptfunktion für das Beispiel"""
    print("WhatsApp Bot Beispiel")
    print("=" * 50)
    
    # Erstelle Agent Core
    agent_core = Core()
    
    # Erstelle WhatsApp Bot mit Konfiguration
    config = {
        'headless': False,  # Browser sichtbar für QR-Code Scan
        'max_retries': 5,
        'retry_delay': 5,
        'monitoring_interval': 3
    }
    whatsapp_bot = SimpleWhatsAppBot(agent_core=agent_core, config=config)
    
    try:
        # Initialisiere Bot
        print("Initialisiere WhatsApp Bot...")
        success = await whatsapp_bot.initialize()
        
        if not success:
            print("Fehler beim Initialisieren des Bots")
            return
        
        print("WhatsApp Bot erfolgreich initialisiert!")
        print("Scanne den QR Code in WhatsApp Web...")
        
        # Setze Message Handler
        whatsapp_bot.set_message_handler(whatsapp_bot.process_incoming_message)
        
        # Starte Monitoring
        print("Starte Nachrichtenüberwachung...")
        await whatsapp_bot.start_monitoring()
        
        print("Bot läuft! Drücke Ctrl+C zum Beenden...")
        
        # Warte auf Benutzer-Unterbrechung
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        print("\nBeende Bot...")
    except Exception as e:
        print(f"Fehler: {e}")
    finally:
        # Schließe Bot
        await whatsapp_bot.close()
        print("Bot beendet.")

async def test_send_message():
    """Testet das Senden einer Nachricht"""
    print("Test: Nachricht senden")
    print("=" * 30)
    
    agent_core = Core()
    whatsapp_bot = SimpleWhatsAppBot(agent_core=agent_core)
    
    try:
        # Initialisiere Bot
        success = await whatsapp_bot.initialize()
        
        if not success:
            print("Fehler beim Initialisieren")
            return
        
        # Teste Nachricht senden
        phone_number = input("Telefonnummer (z.B. +49123456789): ")
        message = input("Nachricht: ")
        
        success = await whatsapp_bot.send_message(phone_number, message)
        
        if success:
            print("Nachricht erfolgreich gesendet!")
        else:
            print("Fehler beim Senden der Nachricht")
            
    except Exception as e:
        print(f"Fehler: {e}")
    finally:
        await whatsapp_bot.close()

if __name__ == "__main__":
    # Starte direkt den vollständigen Bot
    asyncio.run(main())
