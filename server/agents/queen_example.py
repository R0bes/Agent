"""
Beispiel für die Verwendung des Queen-Agenten.
Demonstriert die Singleton-Implementierung und Chat-Funktionalität.
"""

import asyncio
import logging
from datetime import datetime

from .queen_agent import QueenAgent, QueenConfig, get_queen_instance
from .base_agent import StreamChunk

async def demonstrate_chat_functionality():
    """Demonstriert die Chat-Funktionalität der Queen."""
    print("💬 Demonstriere Chat-Funktionalität...")
    
    # Queen initialisieren
    queen = await get_queen_instance()
    
    try:
        # Konversation starten
        print("🎭 Starte Konversation...")
        welcome = await queen.start_conversation(
            user_id="demo_user",
            conversation_id="demo_conv_1",
            initial_message="Hallo Queen!"
        )
        print(f"Queen: {welcome['message']}")
        
        # Chat-Antworten generieren
        print("\n📝 Generiere Chat-Antworten...")
        
        questions = [
            "Kannst du mir erklären, was künstliche Intelligenz ist?",
            "Was ist dein Lieblingsbuch?",
            "Kannst du mir bei der Programmierung helfen?",
            "Erzähle mir einen Witz!"
        ]
        
        for i, question in enumerate(questions, 1):
            print(f"\n--- Frage {i} ---")
            print(f"Benutzer: {question}")
            
            try:
                response = await queen.chat_response(
                    user_message=question,
                    user_id="demo_user",
                    conversation_id="demo_conv_1"
                )
                
                print(f"Queen: {response['response']}")
                print(f"Stil: {response['style']}, Modell: {response['model']}")
                
            except Exception as e:
                print(f"❌ Fehler bei der Antwort: {e}")
        
        # Konversation beenden
        print("\n👋 Beende Konversation...")
        farewell = await queen.end_conversation(
            user_id="demo_user",
            conversation_id="demo_conv_1"
        )
        print(f"Queen: {farewell['message']}")
        
    except Exception as e:
        print(f"❌ Fehler in der Chat-Demonstration: {e}")


async def demonstrate_style_changes():
    """Demonstriert die verschiedenen Antwortstile der Queen."""
    print("🎨 Demonstriere verschiedene Antwortstile...")
    
    queen = await get_queen_instance()
    
    styles = ["friendly", "formal", "casual"]
    test_question = "Wie geht es dir heute?"
    
    for style in styles:
        try:
            print(f"\n--- Stil: {style} ---")
            
            # Stil ändern
            queen.update_queen_style(style)
            
            # Antwort generieren
            response = await queen.chat_response(
                user_message=test_question,
                user_id="style_test_user"
            )
            
            print(f"Queen ({style}): {response['response']}")
            
        except Exception as e:
            print(f"❌ Fehler beim Stil {style}: {e}")
    
    # Zurück zu friendly
    queen.update_queen_style("friendly")
    print()


async def demonstrate_memory_functionality():
    """Demonstriert die Konversationserinnerung der Queen."""
    print("🧠 Demonstriere Konversationserinnerung...")
    
    queen = await get_queen_instance()
    
    try:
        # Konversation mit Kontext
        print("📚 Starte Konversation mit Kontext...")
        
        # Erste Frage
        response1 = await queen.chat_response(
            "Mein Name ist Alice und ich lerne Python-Programmierung.",
            user_id="alice",
            conversation_id="python_lesson"
        )
        print(f"Queen: {response1['response']}")
        
        # Zweite Frage (sollte den Namen erinnern)
        response2 = await queen.chat_response(
            "Kannst du mir bei meinem Python-Projekt helfen?",
            user_id="alice",
            conversation_id="python_lesson"
        )
        print(f"Queen: {response2['response']}")
        
        # Dritte Frage (sollte den Kontext verstehen)
        response3 = await queen.chat_response(
            "Was denkst du über meinen Lernfortschritt?",
            user_id="alice",
            conversation_id="python_lesson"
        )
        print(f"Queen: {response3['response']}")
        
        print(f"\n📊 Erinnerungsgröße: {len(queen.conversation_memory)} Nachrichten")
        
        # Konversation beenden
        await queen.end_conversation(
            user_id="alice",
            conversation_id="python_lesson"
        )
        
    except Exception as e:
        print(f"❌ Fehler bei der Erinnerungsdemonstration: {e}")


async def demonstrate_queen_status():
    """Demonstriert den Status und die Statistiken der Queen."""
    print("📊 Demonstriere Queen-Status...")
    
    queen = await get_queen_instance()
    
    try:
        # Status abrufen
        status = queen.get_queen_status()
        
        print("👑 Queen-Status:")
        for key, value in status.items():
            print(f"  {key}: {value}")
        
        print(f"\n📈 Statistiken:")
        print(f"  Gesamte Konversationen: {queen.total_conversations}")
        print(f"  Gesamte Antworten: {queen.total_responses}")
        print(f"  Aktuelle Erinnerungsgröße: {len(queen.conversation_memory)}")
        print(f"  Antwortstil: {queen.response_style}")
        
    except Exception as e:
        print(f"❌ Fehler beim Status-Abruf: {e}")


async def demonstrate_streaming():
    """Demonstriert die Streaming-Funktionalität der Queen."""
    print("🌊 Demonstriere Streaming-Funktionalität...")
    
    queen = await get_queen_instance()
    
    try:
        # Mock-WebSocket-Handler für Demonstration
        received_chunks = []
        
        def stream_handler(chunk: StreamChunk):
            received_chunks.append(chunk)
            print(f"📡 Chunk empfangen: '{chunk.content}' (done: {chunk.done})")
        
        # WebSocket-Handler hinzufügen
        queen.add_websocket_handler(stream_handler)
        
        # Streaming-Chat-Antwort generieren
        print("💬 Starte gestreamte Antwort...")
        
        async for chunk in queen.chat_response_stream(
            user_message="Erzähle mir eine kurze Geschichte über einen mutigen Ritter.",
            user_id="streaming_user",
            conversation_id="streaming_demo"
        ):
            # Chunks werden bereits über den Handler verarbeitet
            pass
        
        print(f"\n📊 Streaming abgeschlossen:")
        print(f"  Empfangene Chunks: {len(received_chunks)}")
        print(f"  Gesamtinhalt: {sum(len(chunk.content) for chunk in received_chunks)} Zeichen")
        
        # WebSocket-Handler entfernen
        queen.remove_websocket_handler(stream_handler)
        
        # Konversation beenden
        await queen.end_conversation(
            user_id="streaming_user",
            conversation_id="streaming_demo"
        )
        
    except Exception as e:
        print(f"❌ Fehler bei der Streaming-Demonstration: {e}")


async def demonstrate_websocket_streaming():
    """Demonstriert die WebSocket-Streaming-Integration."""
    print("🔌 Demonstriere WebSocket-Streaming-Integration...")
    
    queen = await get_queen_instance()
    
    try:
        # Mock-WebSocket-Handler
        received_chunks = []
        
        def ws_handler(chunk: StreamChunk):
            received_chunks.append(chunk)
            print(f"🔌 WS-Chunk: '{chunk.content}' (done: {chunk.done})")
        
        # WebSocket-Handler hinzufügen
        queen.add_websocket_handler(ws_handler)
        
        # WebSocket-Streaming starten
        print("🚀 Starte WebSocket-Streaming...")
        
        await queen.chat_response_stream_websocket(
            user_message="Was ist dein Lieblingsfach?",
            user_id="ws_user",
            conversation_id="ws_demo"
        )
        
        print(f"\n📊 WebSocket-Streaming abgeschlossen:")
        print(f"  Empfangene Chunks: {len(received_chunks)}")
        
        # WebSocket-Handler entfernen
        queen.remove_websocket_handler(ws_handler)
        
        # Konversation beenden
        await queen.end_conversation(
            user_id="ws_user",
            conversation_id="ws_demo"
        )
        
    except Exception as e:
        print(f"❌ Fehler bei der WebSocket-Streaming-Demonstration: {e}")


async def main():
    """Hauptfunktion für alle Queen-Demonstrationen."""
    print("👑 Queen-Agent Demonstration\n" + "="*60)
    
    try:
        # Alle Demonstrationen ausführen
        await demonstrate_singleton()
        await demonstrate_chat_functionality()
        await demonstrate_style_changes()
        await demonstrate_memory_functionality()
        await demonstrate_queen_status()
        await demonstrate_streaming()
        await demonstrate_websocket_streaming()
        
        print("\n🎉 Alle Queen-Demonstrationen erfolgreich abgeschlossen!")
        
        # Queen-Status nach allen Tests
        queen = await get_queen_instance()
        final_status = queen.get_queen_status()
        print(f"\n📊 Finaler Queen-Status:")
        print(f"  Aktiv: {final_status['is_active']}")
        print(f"  Konversationen: {final_status['total_conversations']}")
        print(f"  Antworten: {final_status['total_responses']}")
        
    except Exception as e:
        print(f"\n💥 Fehler in der Queen-Demonstration: {e}")
        
    finally:
        # Queen bereinigen
        try:
            queen = await get_queen_instance()
            await queen.cleanup()
            print("\n🧹 Queen erfolgreich bereinigt")
        except Exception as e:
            print(f"\n⚠️ Fehler bei der Queen-Bereinigung: {e}")


if __name__ == "__main__":
    # Logging konfigurieren
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Queen-Demonstrationen ausführen
    asyncio.run(main())
