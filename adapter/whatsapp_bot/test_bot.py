#!/usr/bin/env python3
"""
Einfaches Test-Skript für den WhatsApp Bot
"""

import asyncio
import sys
import os

# Füge den aktuellen Pfad zum Python-Path hinzu
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from simple_whatsapp_bot import SimpleWhatsAppBot
except ImportError as e:
    print(f"❌ Import-Fehler: {e}")
    print("💡 Stellen Sie sicher, dass alle Abhängigkeiten installiert sind:")
    print("   pip install -r requirements.txt")
    sys.exit(1)

async def test_bot():
    """Testet den WhatsApp Bot"""
    print("🧪 WhatsApp Bot Test")
    print("=" * 50)
    
    # Bot initialisieren
    bot = SimpleWhatsAppBot(config={'headless': False})
    
    try:
        print("📱 Initialisiere WhatsApp Bot...")
        await bot.initialize()
        
        print("\n✅ Bot erfolgreich initialisiert!")
        print("🔒 Browser ist versteckt")
        print("\n📝 Verfügbare Befehle:")
        print("1. Nachricht senden: 'send <nummer> <nachricht>'")
        print("2. Status abfragen: 'status'")
        print("3. Beenden: 'quit' oder 'exit'")
        print("4. Hilfe: 'help'")
        
        # Nachrichtenüberwachung starten
        await bot.start_monitoring()
        
        # Einfache Kommandozeile
        while True:
            try:
                command = input("\n🤖 Bot-Befehl: ").strip()
                
                # Ignoriere leere Eingaben
                if not command:
                    continue
                
                if command.lower() in ['quit', 'exit', 'q']:
                    print("👋 Bot wird beendet...")
                    break
                    
                elif command.lower() == 'status':
                    status = bot.get_status()
                    print(f"\n📊 Bot Status:")
                    print(f"   Verbindung: {'✅' if status['connected'] else '❌'}")
                    print(f"   Überwachung: {'✅' if status['monitoring'] else '❌'}")
                    print(f"   Browser: {'✅' if status['driver_active'] else '❌'}")
                    print(f"   Letzte Aktivität: {status['last_activity']}")
                    print(f"   Nachrichten: {status['message_count']}")
                    print(f"   Fehler: {status['error_count']}")
                    
                    if 'status_text' in status:
                        print(f"   Status: {status['status_text']}")
                        
                    if 'current_url' in status:
                        print(f"   URL: {status['current_url']}")
                        
                    if 'page' in status:
                        page_names = {
                            'main_page': 'Hauptseite',
                            'chat_page': 'Chat-Seite',
                            'other_page': 'Andere Seite',
                            'unknown': 'Unbekannt'
                        }
                        print(f"   Seite: {page_names.get(status['page'], status['page'])}")
                        
                    if status['last_messages']:
                        print(f"\n📨 Letzte Nachrichten:")
                        for msg in status['last_messages']:
                            print(f"   {msg['time_str']} - {msg['sender']}: {msg['message'][:50]}{'...' if len(msg['message']) > 50 else ''}")
                    else:
                        print(f"\n📨 Keine Nachrichten empfangen")
                    
                elif command.lower() == 'help':
                    print("📚 Verfügbare Befehle:")
                    print("  send <nummer> <nachricht> - Nachricht senden")
                    print("  status - Bot-Status anzeigen")
                    print("  help - Diese Hilfe anzeigen")
                    print("  quit/exit - Bot beenden")
                    
                elif command.lower().startswith('send '):
                    parts = command.split(' ', 2)
                    if len(parts) >= 3:
                        number = parts[1]
                        message = parts[2]
                        print(f"📤 Sende Nachricht an {number}: {message}")
                        
                        success = await bot.send_message(number, message)
                        if success:
                            print("✅ Nachricht erfolgreich gesendet!")
                        else:
                            print("❌ Fehler beim Senden der Nachricht")
                    else:
                        print("❌ Syntax: send <nummer> <nachricht>")
                        print("   Beispiel: send +49123456789 Hallo!")
                        
                else:
                    print("❓ Unbekannter Befehl. Tippe 'help' für Hilfe.")
                    
            except KeyboardInterrupt:
                print("\n👋 Bot wird beendet...")
                break
            except Exception as e:
                print(f"❌ Fehler: {e}")
                if "input" in str(e).lower():
                    print("💡 Eingabe-Fehler - versuche es nochmal")
                continue
                
    except Exception as e:
        print(f"❌ Fehler beim Initialisieren des Bots: {e}")
        
    finally:
        try:
            await bot.stop_monitoring()
            await bot.close()
            print("🔒 Bot erfolgreich beendet")
        except:
            pass

if __name__ == "__main__":
    try:
        asyncio.run(test_bot())
    except KeyboardInterrupt:
        print("\n👋 Programm beendet")
    except Exception as e:
        print(f"❌ Unerwarteter Fehler: {e}")
