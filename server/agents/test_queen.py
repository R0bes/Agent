"""
Tests für den Queen-Agenten.
"""

from .queen_agent import QueenAgent, QueenConfig
from .base_agent import StreamChunk


def test_queen_config():
    """Testet die QueenConfig-Klasse."""
    print("🧪 Teste QueenConfig...")

    config = QueenConfig(
        name="test-queen",
        model="llama2",
        response_style="formal",
        conversation_memory_size=15,
    )

    assert config.name == "test-queen"
    assert config.model == "llama2"
    assert config.response_style == "formal"
    assert config.conversation_memory_size == 15
    assert config.enable_context_awareness is True

    print("✅ QueenConfig funktioniert korrekt")


def test_queen_creation():
    """Testet die Queen-Erstellung."""
    print("🧪 Teste Queen-Erstellung...")

    # Erste Instanz
    queen1 = QueenAgent()
    queen1_id = id(queen1)

    # Zweite Instanz (sollte eine neue sein)
    queen2 = QueenAgent()
    queen2_id = id(queen2)

    # Dritte Instanz mit anderer Konfiguration
    config = QueenConfig(name="different-queen", model="codellama")
    queen3 = QueenAgent(config)
    queen3_id = id(queen3)

    # Alle IDs sollten unterschiedlich sein (kein Singleton)
    assert queen1_id != queen2_id
    assert queen2_id != queen3_id
    assert queen1_id != queen3_id

    # Konfiguration sollte korrekt gesetzt werden
    assert queen1.name == "queen"  # Standard-Name
    assert queen3.name == "different-queen"  # Angepasster Name

    print("✅ Queen-Erstellung funktioniert korrekt")


async def test_queen_methods():
    """Testet die grundlegenden Queen-Methoden."""
    print("🧪 Teste Queen-Methoden...")

    queen = QueenAgent()

    # Teste Konfigurationsmethoden
    assert queen.response_style == "friendly"  # Standard

    # Stil ändern
    queen.update_queen_style("formal")
    assert queen.response_style == "formal"

    # Ungültigen Stil testen
    try:
        queen.update_queen_style("invalid_style")
        assert False, "Sollte einen Fehler werfen"
    except ValueError:
        pass  # Erwarteter Fehler

    # Zurück zu friendly
    queen.update_queen_style("friendly")
    assert queen.response_style == "friendly"

    print("✅ Queen-Methoden funktioniert korrekt")


async def test_queen_status():
    """Testet den Queen-Status."""
    print("🧪 Teste Queen-Status...")

    queen = QueenAgent()

    # Status vor der Initialisierung
    status = queen.get_queen_status()
    assert status["queen_name"] == "Queen"
    assert status["is_active"] is False
    assert status["total_conversations"] == 0
    assert status["total_responses"] == 0
    assert status["response_style"] == "friendly"

    print("✅ Queen-Status funktioniert korrekt")


async def test_memory_management():
    """Testet die Speicherverwaltung der Queen."""
    print("🧪 Teste Speicherverwaltung...")

    queen = QueenAgent()

    # Nachrichten zur Erinnerung hinzufügen
    queen._add_to_memory("user", "Test 1", "user1", "conv1")
    queen._add_to_memory("assistant", "Antwort 1", "user1", "conv1")
    queen._add_to_memory("user", "Test 2", "user2", "conv2")

    assert len(queen.conversation_memory) == 3

    # Speicher für spezifische Konversation löschen
    queen._clear_conversation_memory("user1", "conv1")
    assert len(queen.conversation_memory) == 1

    # Speicher für Benutzer löschen
    queen._clear_conversation_memory("user2")
    assert len(queen.conversation_memory) == 0

    print("✅ Speicherverwaltung funktioniert korrekt")


async def test_system_prompt_enhancement():
    """Testet die System-Prompt-Verbesserung."""
    print("🧪 Teste System-Prompt-Verbesserung...")

    queen = QueenAgent()

    # Standard-Prompt
    base_prompt = queen._enhance_system_prompt("Hallo")
    assert "Queen" in base_prompt
    assert "freundliche" in base_prompt  # "freundliche" statt "freundlich"

    # Programmierung-Kontext
    prog_prompt = queen._enhance_system_prompt("Ich programmiere in Python")
    assert "Programmierung" in prog_prompt or "Software-Entwicklung" in prog_prompt

    # Wissenschaft-Kontext
    science_prompt = queen._enhance_system_prompt("Ich forsche in der Physik")
    assert "Wissenschaft" in science_prompt or "Forschung" in science_prompt

    print("✅ System-Prompt-Verbesserung funktioniert korrekt")


async def test_factory_function():
    """Testet die Factory-Funktion für den Queen-Agenten."""
    print("🧪 Teste Factory-Funktion...")

    # Queen über Factory-Funktion abrufen
    from queen_agent import get_queen_instance

    queen1 = await get_queen_instance()
    queen2 = await get_queen_instance()

    # Sollte funktionierende Instanzen sein
    assert queen1 is not None
    assert queen2 is not None
    assert isinstance(queen1, QueenAgent)
    assert isinstance(queen2, QueenAgent)

    # Mit Konfiguration
    config = QueenConfig(name="factory-queen", model="llama2")
    queen3 = await get_queen_instance(config)

    # Sollte auch funktionieren
    assert queen3 is not None
    assert isinstance(queen3, QueenAgent)

    print("✅ Factory-Funktion funktioniert korrekt")


async def test_queen_streaming():
    """Testet die Streaming-Funktionalität der Queen."""
    print("🧪 Teste Queen-Streaming...")

    queen = QueenAgent()

    # Teste, dass Streaming-Methoden existieren
    assert hasattr(queen, "chat_response_stream")
    assert hasattr(queen, "chat_response_stream_websocket")
    assert hasattr(queen, "emit_chunk")
    assert hasattr(queen, "add_websocket_handler")

    print("✅ Queen-Streaming-Methoden sind verfügbar")


async def test_queen_websocket_integration():
    """Testet die WebSocket-Integration der Queen."""
    print("🧪 Teste Queen-WebSocket-Integration...")

    queen = QueenAgent()

    # Mock-WebSocket-Handler
    received_chunks = []

    def mock_handler(chunk):
        received_chunks.append(chunk)

    # Handler hinzufügen
    queen.add_websocket_handler(mock_handler)

    # Test-Chunk senden
    test_chunk = StreamChunk(content="Test", done=False, model="test-model")

    queen.emit_chunk(test_chunk)

    # Überprüfen, dass der Handler aufgerufen wurde
    assert len(received_chunks) == 1
    assert received_chunks[0].content == "Test"

    # Handler entfernen
    queen.remove_websocket_handler(mock_handler)

    print("✅ Queen-WebSocket-Integration funktioniert")


def run_sync_tests():
    """Führt alle synchronen Tests aus."""
    print("🚀 Starte synchrone Tests...\n")

    try:
        test_queen_config()
        test_queen_creation()
        print("\n✅ Alle synchronen Tests erfolgreich!")
        return True

    except Exception as e:
        print(f"\n❌ Fehler in synchronen Tests: {e}")
        return False


async def run_async_tests():
    """Führt alle asynchronen Tests aus."""
    print("🚀 Starte asynchrone Tests...\n")

    try:
        await test_queen_methods()
        await test_queen_status()
        await test_memory_management()
        await test_system_prompt_enhancement()
        await test_factory_function()
        await test_queen_streaming()
        await test_queen_websocket_integration()
        print("\n✅ Alle asynchronen Tests erfolgreich!")
        return True

    except Exception as e:
        print(f"\n❌ Fehler in asynchronen Tests: {e}")
        import traceback

        traceback.print_exc()
        return False


async def main():
    """Hauptfunktion für alle Queen-Tests."""
    print("👑 Queen-Agent Test-Suite\n" + "=" * 50)

    # Synchrone Tests
    sync_success = run_sync_tests()

    if not sync_success:
        print("\n❌ Synchrone Tests fehlgeschlagen, beende Tests")
        return

    # Asynchrone Tests
    async_success = await run_async_tests()

    if sync_success and async_success:
        print("\n🎉 Alle Queen-Tests erfolgreich abgeschlossen!")
    else:
        print("\n💥 Einige Queen-Tests sind fehlgeschlagen")


if __name__ == "__main__":
    # Queen-Tests ausführen
    import asyncio

    asyncio.run(main())
