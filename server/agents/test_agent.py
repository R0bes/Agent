"""
Einfache Tests für die Agent-Implementierung.
Validiert die grundlegende Funktionalität ohne externe Abhängigkeiten.
"""

import asyncio
import sys
import os

# Füge das übergeordnete Verzeichnis zum Python-Pfad hinzu
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent, AgentConfig, AgentResponse, StreamChunk, AgentError
from agents.ollama_agent import OllamaAgent, OllamaConfig


def test_base_agent_config():
    """Testet die AgentConfig-Klasse."""
    print("🧪 Teste AgentConfig...")
    
    config = AgentConfig(
        name="test-agent",
        model="test-model",
        temperature=0.5,
        max_tokens=100
    )
    
    assert config.name == "test-agent"
    assert config.model == "test-model"
    assert config.temperature == 0.5
    assert config.max_tokens == 100
    
    print("✅ AgentConfig funktioniert korrekt")


def test_ollama_config():
    """Testet die OllamaConfig-Klasse."""
    print("🧪 Teste OllamaConfig...")
    
    config = OllamaConfig(
        name="ollama-test",
        model="llama2",
        base_url="http://localhost:11434",
        stream=False
    )
    
    assert config.name == "ollama-test"
    assert config.model == "llama2"
    assert config.base_url == "http://localhost:11434"
    assert config.stream == False
    assert config.temperature == 0.7  # Standardwert
    
    print("✅ OllamaConfig funktioniert korrekt")


def test_agent_response():
    """Testet die AgentResponse-Klasse."""
    print("🧪 Teste AgentResponse...")
    
    from datetime import datetime
    
    response = AgentResponse(
        content="Test-Antwort",
        model="test-model",
        usage={"tokens": 10}
    )
    
    assert response.content == "Test-Antwort"
    assert response.model == "test-model"
    assert response.usage["tokens"] == 10
    assert isinstance(response.timestamp, datetime)
    
    print("✅ AgentResponse funktioniert korrekt")


def test_agent_error():
    """Testet die AgentError-Klasse."""
    print("🧪 Teste AgentError...")
    
    try:
        raise AgentError("Test-Fehler", "test-agent")
    except AgentError as e:
        assert "Test-Fehler" in str(e)
        assert "test-agent" in str(e)
    
    print("✅ AgentError funktioniert korrekt")


async def test_ollama_agent_creation():
    """Testet die Erstellung eines OllamaAgent-Objekts."""
    print("🧪 Teste OllamaAgent-Erstellung...")
    
    config = OllamaConfig(
        name="test-ollama",
        model="llama2"
    )
    
    agent = OllamaAgent(config)
    
    assert agent.name == "test-ollama"
    assert agent.model == "llama2"
    assert agent.is_initialized == False
    assert agent.base_url == "http://host.docker.internal:11434"
    
    print("✅ OllamaAgent-Erstellung funktioniert korrekt")


async def test_agent_methods():
    """Testet die grundlegenden Methoden des Agenten."""
    print("🧪 Teste Agent-Methoden...")
    
    config = OllamaConfig(
        name="test-ollama",
        model="llama2"
    )
    
    agent = OllamaAgent(config)
    
    # Teste Konfigurationsmethoden
    current_config = agent.get_config()
    assert current_config.name == "test-ollama"
    
    # Teste Konfigurationsaktualisierung
    agent.update_config(temperature=0.9)
    assert agent.config.temperature == 0.9
    
    # Teste String-Repräsentation
    agent_str = str(agent)
    assert "test-ollama" in agent_str
    assert "llama2" in agent_str
    
    print("✅ Agent-Methoden funktioniert korrekt")


def test_stream_chunk():
    """Testet die StreamChunk-Klasse."""
    print("🧪 Teste StreamChunk...")
    
    from datetime import datetime
    
    chunk = StreamChunk(
        content="Test",
        done=False,
        model="test-model",
        usage={"tokens": 5}
    )
    
    assert chunk.content == "Test"
    assert chunk.done == False
    assert chunk.model == "test-model"
    assert chunk.usage["tokens"] == 5
    assert isinstance(chunk.timestamp, datetime)
    
    print("✅ StreamChunk funktioniert korrekt")


async def test_streaming_agent_creation():
    """Testet die Streaming-Funktionalität des OllamaAgent."""
    print("🧪 Teste Streaming-Funktionalität...")
    
    config = OllamaConfig(
        name="test-streaming",
        model="llama2"
    )
    
    agent = OllamaAgent(config)
    
    # Teste, dass die Streaming-Methode existiert
    assert hasattr(agent, 'generate_response_stream')
    assert callable(agent.generate_response_stream)
    
    print("✅ Streaming-Funktionalität ist verfügbar")


def run_sync_tests():
    """Führt alle synchronen Tests aus."""
    print("🚀 Starte synchrone Tests...\n")
    
    try:
        test_base_agent_config()
        test_ollama_config()
        test_agent_response()
        test_agent_error()
        test_stream_chunk()
        print("\n✅ Alle synchronen Tests erfolgreich!")
        
    except Exception as e:
        print(f"\n❌ Fehler in synchronen Tests: {e}")
        return False
    
    return True


async def run_async_tests():
    """Führt alle asynchronen Tests aus."""
    print("🚀 Starte asynchrone Tests...\n")
    
    try:
        await test_ollama_agent_creation()
        await test_agent_methods()
        await test_streaming_agent_creation()
        print("\n✅ Alle asynchronen Tests erfolgreich!")
        
    except Exception as e:
        print(f"\n❌ Fehler in asynchronen Tests: {e}")
        return False
    
    return True


async def main():
    """Hauptfunktion für alle Tests."""
    print("🧪 Agent-Test-Suite\n" + "="*50)
    
    # Synchrone Tests
    sync_success = run_sync_tests()
    
    if not sync_success:
        print("\n❌ Synchrone Tests fehlgeschlagen, beende Tests")
        return
    
    # Asynchrone Tests
    async_success = await run_async_tests()
    
    if sync_success and async_success:
        print("\n🎉 Alle Tests erfolgreich abgeschlossen!")
    else:
        print("\n💥 Einige Tests sind fehlgeschlagen")


if __name__ == "__main__":
    # Tests ausführen
    asyncio.run(main())
