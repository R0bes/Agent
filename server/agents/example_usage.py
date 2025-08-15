"""
Beispiel für die Verwendung der abstrakten Basisklasse und des Ollama-Agenten.
Zeigt die grundlegende Funktionalität und Integration.
"""

import asyncio
import logging
from typing import List, Dict

from .base_agent import BaseAgent, AgentConfig
from .ollama_agent import OllamaAgent, OllamaConfig


async def example_basic_usage():
    """Grundlegendes Beispiel für die Verwendung des Ollama-Agenten."""
    
    # Konfiguration für den Ollama-Agenten
    config = OllamaConfig(
        name="llama2-assistant",
        model="llama2",
        temperature=0.7,
        max_tokens=1000,
        system_prompt="Du bist ein hilfreicher Assistent, der auf Deutsch antwortet.",
        timeout=30
    )
    
    # Agent erstellen
    agent = OllamaAgent(config)
    
    try:
        # Agent initialisieren
        print("Initialisiere Ollama-Agenten...")
        if await agent.initialize():
            print("✅ Agent erfolgreich initialisiert!")
            
            # Gesundheitscheck durchführen
            health = await agent.health_check()
            print(f"Gesundheitsstatus: {health}")
            
            # Verfügbare Modelle auflisten
            try:
                models = await agent.list_models()
                print(f"Verfügbare Modelle: {[m.get('name', 'unknown') for m in models]}")
            except Exception as e:
                print(f"Fehler beim Abrufen der Modelle: {e}")
            
            # Einfache Antwort generieren
            print("\nGeneriere Antwort...")
            response = await agent.generate_response(
                "Erkläre mir kurz, was künstliche Intelligenz ist."
            )
            
            print(f"Antwort: {response.content}")
            print(f"Modell: {response.model}")
            print(f"Token-Verbrauch: {response.usage}")
            
        else:
            print("❌ Fehler bei der Initialisierung des Agenten")
            
    except Exception as e:
        print(f"Fehler: {e}")
        
    finally:
        # Ressourcen bereinigen
        await agent.cleanup()


async def example_with_context():
    """Beispiel mit Kontext für eine Konversation."""
    
    config = OllamaConfig(
        name="conversation-assistant",
        model="llama2",
        temperature=0.8,
        system_prompt="Du bist ein freundlicher Gesprächspartner."
    )
    
    agent = OllamaAgent(config)
    
    try:
        if await agent.initialize():
            print("✅ Konversations-Agent initialisiert!")
            
            # Kontext für eine Konversation
            context = [
                {"role": "user", "content": "Hallo! Wie geht es dir?"},
                {"role": "assistant", "content": "Hallo! Mir geht es gut, danke der Nachfrage. Wie kann ich dir helfen?"},
                {"role": "user", "content": "Kannst du mir eine Geschichte erzählen?"}
            ]
            
            # Antwort mit Kontext generieren
            response = await agent.generate_response(
                "Erzähle mir bitte eine kurze Geschichte über einen mutigen Ritter.",
                context=context
            )
            
            print(f"Antwort mit Kontext: {response.content}")
            
        else:
            print("❌ Fehler bei der Initialisierung")
            
    except Exception as e:
        print(f"Fehler: {e}")
        
    finally:
        await agent.cleanup()


async def example_agent_factory():
    """Beispiel für eine Agent-Factory mit der abstrakten Basisklasse."""
    
    def create_agent(agent_type: str, **kwargs) -> BaseAgent:
        """Factory-Funktion für verschiedene Agent-Typen."""
        
        if agent_type == "ollama":
            config = OllamaConfig(**kwargs)
            return OllamaAgent(config)
        else:
            raise ValueError(f"Unbekannter Agent-Typ: {agent_type}")
    
    # Verschiedene Agenten erstellen
    agents = []
    
    try:
        # Ollama-Agent mit Llama2
        llama_agent = create_agent(
            "ollama",
            name="llama2-expert",
            model="llama2",
            temperature=0.5,
            system_prompt="Du bist ein Experte für Programmierung."
        )
        agents.append(llama_agent)
        
        # Ollama-Agent mit CodeLlama
        code_agent = create_agent(
            "ollama",
            name="codellama-expert",
            model="codellama",
            temperature=0.3,
            system_prompt="Du bist ein Experte für Code-Review und Programmierung."
        )
        agents.append(code_agent)
        
        # Alle Agenten initialisieren
        for agent in agents:
            if await agent.initialize():
                print(f"✅ {agent.name} erfolgreich initialisiert")
            else:
                print(f"❌ {agent.name} Initialisierung fehlgeschlagen")
        
        # Gesundheitscheck für alle Agenten
        for agent in agents:
            health = await agent.health_check()
            print(f"Gesundheit von {agent.name}: {health['status']}")
            
    except Exception as e:
        print(f"Fehler in der Agent-Factory: {e}")
        
    finally:
        # Alle Agenten bereinigen
        for agent in agents:
            await agent.cleanup()


async def main():
    """Hauptfunktion für alle Beispiele."""
    
    print("🤖 Agent-Beispiele\n" + "="*50)
    
    print("\n1. Grundlegende Verwendung:")
    await example_basic_usage()
    
    print("\n2. Verwendung mit Kontext:")
    await example_with_context()
    
    print("\n3. Agent-Factory Beispiel:")
    await example_agent_factory()
    
    print("\n✅ Alle Beispiele abgeschlossen!")


if __name__ == "__main__":
    # Logging konfigurieren
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Beispiele ausführen
    asyncio.run(main())
