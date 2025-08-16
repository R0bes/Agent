"""
Experiment mit LLM-Konversationen.
"""

import asyncio
import logging
import random
from typing import List, Dict, Any, Optional
from datetime import datetime

from .ollama_agent import OllamaAgent, OllamaConfig


class ConversationAgent(OllamaAgent):
    def __init__(self, name: str, personality: str, model: str = "llama3"):
        config = OllamaConfig(
            name=name,
            model=model,
            temperature=0.8,
            system_prompt=f"Du bist {name}. {personality} "
            f"Antworte immer in der ersten Person als {name}. "
            f"Sei interessiert an dem, was der andere sagen,"
            f"aver beende die Unterhaltung, wenn du keine Lust mehr hast.",
        )
        super().__init__(config)
        self.personality = personality
        self.conversation_history: List[Dict[str, str]] = []

    async def chat_with_agent(self, message: str, other_agent_name: str) -> str:
        """
        Chat mit einem anderen Agenten.

        Args:
            message: Nachricht vom anderen Agenten
            other_agent_name: Name des anderen Agenten

        Returns:
            Antwort des Agenten
        """
        # Konversationsverlauf aktualisieren
        self.conversation_history.append(
            {"from": other_agent_name, "message": message, "timestamp": datetime.now().isoformat()}
        )

        # Prompt für die Antwort erstellen
        context = f"Du chattest mit {other_agent_name}. "
        if self.conversation_history:
            context += f"Die letzte Nachricht war: '{message}'"

        # Antwort generieren
        try:
            response = await self.generate_response(
                prompt=f"Antworte auf diese Nachricht von {other_agent_name}: '{message}'",
                context=[{"role": "user", "content": context}],
            )

            # Antwort zum Verlauf hinzufügen
            self.conversation_history.append(
                {
                    "from": self.name,
                    "message": response.content,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            return response.content

        except Exception as e:
            error_msg = f"Entschuldigung, ich hatte einen Fehler: {str(e)}"
            self.conversation_history.append(
                {"from": self.name, "message": error_msg, "timestamp": datetime.now().isoformat()}
            )
            return error_msg


class LLMConversationExperiment:
    """
    Hauptklasse für das LLM-Konversations-Experiment.
    Koordiniert die Konversation zwischen zwei Agenten.
    """

    def __init__(self):
        """Initialisiert das Experiment."""
        self.agent1: Optional[ConversationAgent] = None
        self.agent2: Optional[ConversationAgent] = None
        self.conversation_log: List[Dict[str, Any]] = []
        self.max_turns = 10  # Maximale Anzahl von Konversationsrunden

    async def setup_agents(self):
        """Erstellt und initialisiert die beiden Agenten."""
        print("🤖 Initialisiere Agenten...")

        # Agent 1: Philosophischer Denker
        self.agent1 = ConversationAgent(
            name="TaX-27",
            personality="Du bist ein Philosoph, der über die Welt nachdenkt. "
            "Du bist ein Mensch, aber du bist auch ein Gott. "
            "",
            model="gpt-oss:20b",
        )

        # Agent 2: Kreativer Künstler
        self.agent2 = ConversationAgent(
            name="Vingt-huit",
            personality="Du bist leidenschaftlicher, komplex und unvorhersehbar. "
            "Du bist emotional und ausdrucksstark. "
            "Du bist ein Genie, aber du bist auch ein Idiot. ",
            model="gpt-oss:20b",
        )

        # Beide Agenten initialisieren
        try:
            await self.agent1.initialize()
            await self.agent2.initialize()
            print("✅ Agenten erfolgreich initialisiert!")
        except Exception as e:
            print(f"❌ Fehler beim Initialisieren der Agenten: {e}")
            raise

    async def start_conversation(self, initial_topic: str = "Was ist der Sinn des Lebens?"):
        """
        Startet eine Konversation zwischen den beiden Agenten.

        Args:
            initial_topic: Das erste Gesprächsthema
        """
        if not self.agent1 or not self.agent2:
            raise ValueError("Agenten müssen zuerst initialisiert werden!")

        print(f"\n🎭 Starte Konversation zwischen {self.agent1.name} und {self.agent2.name}")
        print(f"📝 Thema: {initial_topic}")
        print("=" * 80)

        # Erste Nachricht von Agent 1
        current_message = initial_topic
        current_speaker = self.agent1
        other_agent = self.agent2

        turn_count = 0

        while turn_count < self.max_turns:
            turn_count += 1
            print(f"\n🔄 Runde {turn_count}")
            print(f"💬 {current_speaker.name}: {current_message}")

            # Antwort vom anderen Agenten generieren
            try:
                response = await other_agent.chat_with_agent(
                    message=current_message, other_agent_name=current_speaker.name
                )

                # Konversation loggen
                self.conversation_log.append(
                    {
                        "turn": turn_count,
                        "speaker": current_speaker.name,
                        "message": current_message,
                        "responder": other_agent.name,
                        "response": response,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                # Für nächste Runde vorbereiten
                current_message = response
                current_speaker, other_agent = other_agent, current_speaker

                # Kurze Pause für bessere Lesbarkeit
                await asyncio.sleep(1)

            except Exception as e:
                print(f"❌ Fehler in Runde {turn_count}: {e}")
                break

        print(f"\n🏁 Konversation nach {turn_count} Runden beendet.")
        self._print_conversation_summary()

    def _print_conversation_summary(self):
        """Gibt eine Zusammenfassung der Konversation aus."""
        print("\n📊 Konversations-Zusammenfassung:")
        print(f"  Gesamtrunden: {len(self.conversation_log)}")
        print(
            f"  {self.agent1.name} sprach: {len([log for log in self.conversation_log if log['speaker'] == self.agent1.name])} mal"
        )
        print(
            f"  {self.agent2.name} sprach: {len([log for log in self.conversation_log if log['speaker'] == self.agent2.name])} mal"
        )

        print("\n💭 Letzte Nachrichten:")
        for log in self.conversation_log[-3:]:  # Letzte 3 Nachrichten
            print(f"  {log['speaker']}: {log['message'][:100]}...")

    async def cleanup(self):
        """Bereinigt die Agenten."""
        print("\n🧹 Bereinige Agenten...")
        try:
            if self.agent1:
                await self.agent1.cleanup()
            if self.agent2:
                await self.agent2.cleanup()
            print("✅ Bereinigung abgeschlossen!")
        except Exception as e:
            print(f"⚠️ Fehler bei der Bereinigung: {e}")


async def run_experiment():
    """Führt das LLM-Konversations-Experiment aus."""
    print("🧪 LLM-Konversations-Experiment")
    print("=" * 50)

    experiment = LLMConversationExperiment()

    try:
        # Agenten einrichten
        await experiment.setup_agents()

        # Verschiedene Konversationen starten
        topics = [
            "Was ist der Sinn des Lebens?",
            "Wie definierst du Schönheit?",
            "Was bedeutet Kreativität für dich?",
            "Wie siehst du die Zukunft der Menschheit?",
        ]

        for topic in topics:
            print(f"\n{'='*80}")
            await experiment.start_conversation(initial_topic=topic)
            await asyncio.sleep(2)  # Pause zwischen Konversationen

    except Exception as e:
        print(f"💥 Fehler im Experiment: {e}")

    finally:
        # Aufräumen
        await experiment.cleanup()


async def simple_conversation():
    """Einfache Konversation zwischen zwei Agenten."""
    print("💬 Einfache LLM-Konversation")
    print("=" * 40)

    experiment = LLMConversationExperiment()

    try:
        await experiment.setup_agents()
        await experiment.start_conversation("Hallo! Wie geht es dir heute?")

    except Exception as e:
        print(f"💥 Fehler: {e}")

    finally:
        await experiment.cleanup()


if __name__ == "__main__":
    # Logging konfigurieren
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Einfache Konversation ausführen
    asyncio.run(simple_conversation())
