"""
Docker-optimiertes Beispiel für den WhatsApp Bot
"""

import asyncio
import sys
import os

# Füge den Projektpfad hinzu
sys.path.append('/app')

from adapter.whatsapp_bot.simple_whatsapp_bot import SimpleWhatsAppBot
from agent.core import Core

async def main():
    """Docker-optimierte Hauptfunktion"""
    print("🐳 WhatsApp Bot Docker Version")
    print("=" * 50)
    
    # Konfiguration aus Umgebungsvariablen
    config = {
        'headless': os.getenv('WHATSAPP_HEADLESS', 'true').lower() == 'true',
        'max_retries': int(os.getenv('WHATSAPP_MAX_RETRIES', '3')),
        'retry_delay': int(os.getenv('WHATSAPP_RETRY_DELAY', '5')),
        'monitoring_interval': int(os.getenv('WHATSAPP_MONITORING_INTERVAL', '3'))
    }
    
    print(f"Konfiguration: {config}")
    
    # Erstelle Agent Core
    agent_core = Core()
    
    # Erstelle WhatsApp Bot
    bot = SimpleWhatsAppBot(agent_core=agent_core, config=config)
    
    try:
        print("1. Initialisiere Bot...")
        success = await bot.initialize()
        
        if not success:
            print("❌ Fehler beim Initialisieren des Bots")
            return False
        
        print("✅ Bot erfolgreich initialisiert!")
        
        if not config['headless']:
            print("📱 Scanne den QR Code in WhatsApp Web...")
            print("ℹ️  Der Browser sollte sichtbar sein")
        else:
            print("📱 Headless Mode - QR Code muss manuell gescannt werden")
            print("ℹ️  Verbinde dich mit dem Container um den QR Code zu sehen")
        
        print("2. Setze Message Handler...")
        bot.set_message_handler(bot.process_incoming_message)
        
        print("3. Starte Monitoring...")
        await bot.start_monitoring()
        
        print("✅ Bot läuft! Sende SIGTERM zum Beenden...")
        
        # Warte auf Signal
        while True:
            await asyncio.sleep(1)
            
            # Überprüfe Bot-Gesundheit
            if not bot.is_healthy():
                print("⚠️ Bot ist nicht mehr gesund, versuche Neuverbindung...")
                await bot.close()
                success = await bot.initialize()
                
                if success:
                    await bot.start_monitoring()
                else:
                    print("❌ Neuverbindung fehlgeschlagen")
                    break
            
    except KeyboardInterrupt:
        print("\n⏹️ Beende Bot...")
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False
    finally:
        # Schließe Bot
        await bot.close()
        print("✅ Bot beendet.")
    
    return True

if __name__ == "__main__":
    asyncio.run(main())


