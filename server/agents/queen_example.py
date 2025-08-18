"""
Beispiel für die Verwendung des Queen-Agenten.
"""

import asyncio
from .ollama_agent import OllamaAgent


async def demonstrate_chat_functionality():
    """Demonstriert die Chat-Funktionalität der Queen."""
    print("💬 Demonstriere Chat-Funktionalität...")

    # Queen initialisieren
    queen = await OllamaAgent.get_instance()

    try:
        # Konversation starten
        print("🎭 Starte Konversation...")
        welcome = await queen.start_conversation(
            user_id="demo_user",
            conversation_id="demo_conv_1",
            initial_message="Hallo Queen!",
        )
        print(f"Queen: {welcome['message']}")

        # Chat-Antworten generieren
        print("\n📝 Generiere Chat-Antworten...")

        questions = [
            "Kannst du mir erklären, was künstliche Intelligenz ist?",
            "Was ist dein Lieblingsbuch?",
            "Kannst du mir bei der Programmierung helfen?",
            "Erzähle mir einen Witz!",
        ]

        for i, question in enumerate(questions, 1):
            print(f"\n--- Frage {i} ---")
            print(f"Benutzer: {question}")

            try:
                response = await queen.chat_response(
                    user_message=question,
                    user_id="demo_user",
                    conversation_id="demo_conv_1",
                )

                print(f"Queen: {response['response']}")
                print(f"Stil: {response['style']}, Modell: {response['model']}")

            except Exception as e:
                print(f"❌ Fehler bei der Antwort: {e}")

        # Konversation beenden
        print("\n👋 Beende Konversation...")
        farewell = await queen.end_conversation(
            user_id="demo_user", conversation_id="demo_conv_1"
        )
        print(f"Queen: {farewell['message']}")

    except Exception as e:
        print(f"❌ Fehler in der Chat-Demonstration: {e}")


async def demonstrate_style_changes():
    """Demonstriert die verschiedenen Antwortstile der Queen."""
    print("🎨 Demonstriere verschiedene Antwortstile...")

    queen = await OllamaAgent.get_instance()

    styles = ["friendly", "formal", "casual"]
    test_question = "Wie geht es dir heute?"

    for style in styles:
        try:
            print(f"\n--- Stil: {style} ---")

            # Stil ändern
            queen.update_queen_style(style)

            # Antwort generieren
            response = await queen.chat_response(
                user_message=test_question, user_id="style_test_user"
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

    queen = await OllamaAgent.get_instance()

    try:
        # Konversation mit Kontext
        print("📚 Starte Konversation mit Kontext...")
        welcome = await queen.start_conversation(
            user_id="memory_test_user", conversation_id="memory_conv_1"
        )
        print(f"Queen: {welcome['message']}")

        # Mehrere Nachrichten in Folge
        messages = [
            "Mein Name ist Alice.",
            "Ich studiere Informatik.",
            "Was weißt du über mich?",
        ]

        for i, message in enumerate(messages, 1):
            print(f"\n--- Nachricht {i} ---")
            print(f"Alice: {message}")

            try:
                response = await queen.chat_response(
                    user_message=message,
                    user_id="memory_test_user",
                    conversation_id="memory_conv_1",
                )

                print(f"Queen: {response['response']}")

            except Exception as e:
                print(f"❌ Fehler bei der Antwort: {e}")

        # Konversation beenden
        farewell = await queen.end_conversation(
            user_id="memory_test_user", conversation_id="memory_conv_1"
        )
        print(f"Queen: {farewell['message']}")

    except Exception as e:
        print(f"❌ Fehler in der Memory-Demonstration: {e}")


async def demonstrate_streaming():
    """Demonstriert die Streaming-Funktionalität der Queen."""
    print("🌊 Demonstriere Streaming-Funktionalität...")

    queen = await OllamaAgent.get_instance()

    try:
        # Streaming-Chat starten
        print("📡 Starte Streaming-Chat...")
        welcome = await queen.start_conversation(
            user_id="stream_user", conversation_id="stream_conv_1"
        )
        print(f"Queen: {welcome['message']}")

        # Streaming-Antwort generieren
        question = "Erzähle mir eine kurze Geschichte über einen mutigen Ritter."
        print(f"\nBenutzer: {question}")

        print("\nQueen (Streaming):")
        received_chunks = []

        async for chunk in queen.stream_chat_response(
            user_message=question,
            user_id="stream_user",
            conversation_id="stream_conv_1",
        ):
            print(chunk.content, end="", flush=True)
            received_chunks.append(chunk)

            if chunk.done:
                break

        print("\n\n📊 Streaming abgeschlossen:")
        print(f"  Empfangene Chunks: {len(received_chunks)}")
        print(
            f"  Gesamtinhalt: {sum(len(chunk.content) for chunk in received_chunks)} Zeichen"
        )

        # Konversation beenden
        farewell = await queen.end_conversation(
            user_id="stream_user", conversation_id="stream_conv_1"
        )
        print(f"Queen: {farewell['message']}")

    except Exception as e:
        print(f"❌ Fehler in der Streaming-Demonstration: {e}")


async def demonstrate_websocket_streaming():
    """Demonstriert die WebSocket-Streaming-Integration."""
    print("🔌 Demonstriere WebSocket-Streaming-Integration...")

    queen = await OllamaAgent.get_instance()

    try:
        # WebSocket-Streaming starten
        print("🌐 Starte WebSocket-Streaming...")
        welcome = await queen.start_conversation(
            user_id="ws_user", conversation_id="ws_conv_1"
        )
        print(f"Queen: {welcome['message']}")

        # WebSocket-Streaming simulieren
        question = "Erkläre mir, was Machine Learning ist."
        print(f"\nBenutzer: {question}")

        print("\nQueen (WebSocket Streaming):")
        received_chunks = []

        # Simuliere WebSocket-Streaming
        async for chunk in queen.stream_chat_response(
            user_message=question, user_id="ws_user", conversation_id="ws_conv_1"
        ):
            print(chunk.content, end="", flush=True)
            received_chunks.append(chunk)

            if chunk.done:
                break

        print("\n\n📊 WebSocket-Streaming abgeschlossen:")
        print(f"  Empfangene Chunks: {len(received_chunks)}")
        print(
            f"  Gesamtinhalt: {sum(len(chunk.content) for chunk in received_chunks)} Zeichen"
        )

        # Konversation beenden
        farewell = await queen.end_conversation(
            user_id="ws_user", conversation_id="ws_conv_1"
        )
        print(f"Queen: {farewell['message']}")

    except Exception as e:
        print(f"❌ Fehler im WebSocket-Streaming: {e}")


async def main():
    """Hauptfunktion für alle Demonstrationen."""
    print("👑 QUEEN AGENT DEMONSTRATION")
    print("=" * 50)

    try:
        # Alle Demonstrationen ausführen
        await demonstrate_chat_functionality()
        await demonstrate_style_changes()
        await demonstrate_memory_functionality()
        await demonstrate_streaming()
        await demonstrate_websocket_streaming()

        # Queen-Status nach allen Tests
        queen = await OllamaAgent.get_instance()
        final_status = queen.get_queen_status()
        print("\n📊 Finaler Queen-Status:")
        for key, value in final_status.items():
            print(f"  {key}: {value}")

        print("\n🎉 Alle Demonstrationen erfolgreich abgeschlossen!")

    except Exception as e:
        print(f"❌ Fehler in der Hauptdemonstration: {e}")

    finally:
        # Queen bereinigen
        try:
            queen = await OllamaAgent.get_instance()
            await queen.cleanup()
            print("\n🧹 Queen erfolgreich bereinigt")
        except Exception as e:
            print(f"⚠️  Fehler beim Bereinigen: {e}")


if __name__ == "__main__":
    asyncio.run(main())
