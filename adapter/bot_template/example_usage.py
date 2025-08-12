"""
Beispiel für die Verwendung des Bot-Interfaces
Zeigt wie man WhatsApp und Telegram Bots mit FastAPI startet
"""

import asyncio
import os
import sys
from typing import Dict, Any

# Füge den Projektpfad hinzu
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bot_interface import BotFactory, FastAPIBotWrapper

async def main():
    """Hauptfunktion für das Beispiel"""
    print("🤖 Bot Interface Beispiel")
    print("=" * 50)
    
    # Bot-Typ aus Umgebungsvariablen oder Standard
    bot_type = os.getenv('BOT_TYPE', 'whatsapp').lower()
    
    print(f"Starte {bot_type.upper()} Bot...")
    
    # Bot-spezifische Konfiguration
    if bot_type == 'whatsapp':
        config = {
            'headless': os.getenv('WHATSAPP_HEADLESS', 'true').lower() == 'true',
            'max_retries': int(os.getenv('WHATSAPP_MAX_RETRIES', '3')),
            'retry_delay': int(os.getenv('WHATSAPP_RETRY_DELAY', '5')),
            'monitoring_interval': int(os.getenv('WHATSAPP_MONITORING_INTERVAL', '3')),
            'qr_timeout': int(os.getenv('WHATSAPP_QR_TIMEOUT', '300')),
            'chrome_options': [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        }
        api_port = int(os.getenv('API_PORT', '8001'))
        
    elif bot_type == 'telegram':
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        if not token:
            print("❌ TELEGRAM_BOT_TOKEN Umgebungsvariable ist erforderlich!")
            return False
        
        config = {
            'token': token,
            'webhook_url': os.getenv('TELEGRAM_WEBHOOK_URL'),
            'polling': os.getenv('TELEGRAM_POLLING', 'true').lower() == 'true',
            'allowed_users': os.getenv('TELEGRAM_ALLOWED_USERS', '').split(',') if os.getenv('TELEGRAM_ALLOWED_USERS') else [],
            'max_retries': int(os.getenv('TELEGRAM_MAX_RETRIES', '3')),
            'retry_delay': int(os.getenv('TELEGRAM_RETRY_DELAY', '5'))
        }
        api_port = int(os.getenv('API_PORT', '8002'))
        
    else:
        print(f"❌ Unbekannter Bot-Typ: {bot_type}")
        return False
    
    print(f"Konfiguration: {config}")
    print(f"API Port: {api_port}")
    
    try:
        # Bot erstellen
        print(f"1. Erstelle {bot_type} Bot...")
        bot = BotFactory.create_bot(bot_type, config)
        
        # FastAPI Wrapper erstellen
        print(f"2. Erstelle FastAPI Wrapper...")
        api_wrapper = FastAPIBotWrapper(
            bot, 
            host="0.0.0.0", 
            port=api_port
        )
        
        # Bot initialisieren
        print(f"3. Initialisiere {bot_type} Bot...")
        success = await bot.initialize()
        
        if not success:
            print(f"❌ Fehler beim Initialisieren des {bot_type} Bots")
            return False
        
        print(f"✅ {bot_type.capitalize()} Bot erfolgreich initialisiert!")
        
        # Message Handler setzen
        print(f"4. Setze Message Handler...")
        bot.set_message_handler(bot.process_incoming_message)
        
        # Monitoring starten
        print(f"5. Starte Monitoring...")
        await bot.start_monitoring()
        
        # FastAPI-Server starten
        print(f"6. Starte FastAPI-Server auf Port {api_port}...")
        print(f"📖 API-Dokumentation: http://localhost:{api_port}/docs")
        print(f"🏥 Health Check: http://localhost:{api_port}/health")
        print(f"📊 Status: http://localhost:{api_port}/status")
        
        await api_wrapper.start()
        
    except KeyboardInterrupt:
        print(f"\n⏹️ Beende {bot_type} Bot...")
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False
    finally:
        # Bot schließen
        if 'bot' in locals():
            await bot.close()
            print(f"✅ {bot_type.capitalize()} Bot beendet.")
    
    return True

def run_sync():
    """Synchroner Wrapper für die Hauptfunktion"""
    return asyncio.run(main())

if __name__ == "__main__":
    success = run_sync()
    sys.exit(0 if success else 1)
