"""
Queen Agent - Ein intelligenter Agent, der andere Agenten koordiniert.
"""

import logging
from typing import Dict, Any, Optional, List, Callable, AsyncGenerator
from datetime import datetime

from .ollama_agent import OllamaAgent, OllamaConfig
from .base_agent import StreamChunk


class QueenConfig(OllamaConfig):
    """Spezielle Konfiguration für den Queen-Agenten."""
    default_system_prompt: str = (
        "Du bist die Queen - eine weise, freundliche und hilfreiche "
        "Assistentin. Du antwortest immer höflich und respektvoll. "
        "Du bist eine Expertin in vielen Bereichen und kannst komplexe "
        "Fragen verständlich erklären. Antworte auf Deutsch, es sei denn, "
        "du wirst explizit in einer anderen Sprache angesprochen."
    )
    conversation_memory_size: int = 10  # Anzahl der zu behaltenden Nachrichten
    response_style: str = "friendly"  # friendly, formal, casual
    enable_context_awareness: bool = True


class QueenAgent(OllamaAgent):
    """
    Queen-Agent mit erweiterter Chat-Funktionalität.

    Diese Klasse erbt von OllamaAgent und fügt erweiterte Chat-Funktionalität
    hinzu.
    """

    def __init__(self, config: Optional[QueenConfig] = None):
        """
        Initialisiert den Queen-Agenten.

        Args:
            config: Queen-spezifische Konfiguration
        """
        if config is None:
            config = QueenConfig(
                name="queen",
                model="llama3",
                temperature=0.8,
                system_prompt=(
                    "Du bist die Queen - eine weise, freundliche und "
                    "hilfreiche Assistentin."
                )
            )

        # Basis-Initialisierung
        super().__init__(config)

        # Queen-spezifische Attribute
        self.conversation_memory: List[Dict[str, str]] = []
        self.memory_size = config.conversation_memory_size
        self.response_style = config.response_style
        self.context_awareness = config.enable_context_awareness
        self.queen_logger = logging.getLogger(f"{__name__}.queen")

        # Queen-Status
        self.is_queen_active = False
        self.total_conversations = 0
        self.total_responses = 0

        self.queen_logger.info("Queen-Agent initialisiert")

        # WebSocket-Integration (Mock)
        self.websocket_handlers: List[
            Callable[[StreamChunk], None]
        ] = []

    async def initialize(self) -> bool:
        """
        Initialisiert den Queen-Agenten.

        Returns:
            True wenn erfolgreich initialisiert, False sonst
        """
        if self.is_queen_active:
            return True

        # Basis-Initialisierung durchführen
        base_success = await super().initialize()
        if not base_success:
            return False

        # Queen-spezifische Initialisierung
        try:
            self.is_queen_active = True
            self.queen_logger.info(
                "Queen ist aktiv und bereit für Konversationen"
            )
            return True

        except Exception as e:
            self.queen_logger.error(
                f"Fehler bei der Queen-Initialisierung: {e}"
            )
            return False

    async def chat_response(
        self,
        user_message: str,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generiert eine Chat-Antwort der Queen.

        Args:
            user_message: Nachricht des Benutzers
            user_id: Optionaler Benutzer-Identifier
            conversation_id: Optionaler Konversations-Identifier
            **kwargs: Zusätzliche Parameter

        Returns:
            Dictionary mit der Queen-Antwort und Metadaten
        """
        if not self.is_queen_active:
            raise Exception("Queen ist nicht aktiv")

        try:
            # Konversation zur Erinnerung hinzufügen
            self._add_to_memory("user", user_message, user_id, conversation_id)

            # System-Prompt anpassen basierend auf Kontext
            enhanced_system_prompt = self._enhance_system_prompt(user_message)

            # Antwort generieren
            response = await self.generate_response(
                prompt=user_message,
                context=(
                    self.conversation_memory if self.context_awareness
                    else None
                ),
                system_prompt=enhanced_system_prompt,
                **kwargs
            )

            # Queen-Antwort zur Erinnerung hinzufügen
            self._add_to_memory(
                "assistant", response.content, user_id, conversation_id
            )

            # Statistiken aktualisieren
            self.total_responses += 1

            # Antwort formatieren
            queen_response = {
                "response": response.content,
                "queen_name": "Queen",
                "timestamp": response.timestamp.isoformat(),
                "conversation_id": conversation_id,
                "user_id": user_id,
                "model": response.model,
                "style": self.response_style,
                "memory_size": len(self.conversation_memory)
            }

            self.queen_logger.info(
                f"Queen hat auf Nachricht von {user_id or 'unbekannt'} "
                "geantwortet"
            )
            return queen_response

        except Exception as e:
            self.queen_logger.error(f"Fehler bei der Chat-Antwort: {e}")
            raise

    async def chat_response_stream(
        self,
        user_message: str,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        on_chunk: Optional[Callable[[StreamChunk], None]] = None,
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Generiert eine gestreamte Chat-Antwort der Queen.

        Args:
            user_message: Nachricht des Benutzers
            user_id: Optionaler Benutzer-Identifier
            conversation_id: Optionaler Konversations-Identifier
            on_chunk: Optionaler Callback für jeden Chunk
            **kwargs: Zusätzliche Parameter

        Yields:
            StreamChunk für jeden Token

        Falls Streaming fehlschlägt, wird auf normale Antworten "
        "zurückgegriffen.
        """
        if not self.is_queen_active:
            raise Exception("Queen ist nicht aktiv")

        try:
            # Konversation zur Erinnerung hinzufügen
            self._add_to_memory(
                "user", user_message, user_id, conversation_id
            )

            # System-Prompt anpassen basierend auf Kontext
            enhanced_system_prompt = self._enhance_system_prompt(
                user_message
            )

            # Streaming-Antwort versuchen
            try:
                async for chunk in self.generate_response_stream(
                    prompt=user_message,
                    context=(
                        self.conversation_memory if self.context_awareness
                        else None
                    ),
                    system_prompt=enhanced_system_prompt,
                    on_chunk=on_chunk,
                    **kwargs
                ):
                    # Chunk weitergeben
                    yield chunk

                    # Bei done=True abbrechen
                    if chunk.done:
                        break

                # Queen-Antwort zur Erinnerung hinzufügen (kompletter Inhalt)
                # Da wir den kompletten Inhalt nicht haben, sammeln wir ihn
                complete_response = ""
                async for chunk in self.generate_response_stream(
                    prompt=user_message,
                    context=(
                        self.conversation_memory if self.context_awareness
                        else None
                    ),
                    system_prompt=enhanced_system_prompt,
                    **kwargs
                ):
                    complete_response += chunk.content
                    if chunk.done:
                        break

                self._add_to_memory(
                    "assistant", complete_response, user_id, conversation_id
                )

            except Exception as stream_error:
                # Fallback auf normale Antworten
                self.queen_logger.warning(
                    f"Streaming fehlgeschlagen, verwende Fallback: "
                    f"{stream_error}"
                )

                # Normale Antwort generieren
                response = await self.generate_response(
                    prompt=user_message,
                    context=(
                        self.conversation_memory if self.context_awareness
                        else None
                    ),
                    system_prompt=enhanced_system_prompt,
                    **kwargs
                )

                # Queen-Antwort zur Erinnerung hinzufügen
                self._add_to_memory(
                    "assistant", response.content, user_id, conversation_id
                )

                # Als StreamChunk mit done=True senden
                fallback_chunk = StreamChunk(
                    content=response.content,
                    done=True,
                    model=response.model,
                    usage=response.usage
                )

                if on_chunk:
                    on_chunk(fallback_chunk)

                yield fallback_chunk

            # Statistiken aktualisieren
            self.total_responses += 1

            self.queen_logger.info(
                f"Queen hat gestreamte Antwort für "
                f"{user_id or 'unbekannt'} generiert"
            )

        except Exception as e:
            self.queen_logger.error(
                f"Fehler bei der gestreamten Chat-Antwort: {e}"
            )
            raise

    def add_websocket_handler(
        self, handler: Callable[[StreamChunk], None]
    ) -> None:
        """Fügt einen WebSocket-Handler hinzu."""
        self.websocket_handlers.append(handler)
        self.queen_logger.info("WebSocket-Handler hinzugefügt")

    def remove_websocket_handler(
        self, handler: Callable[[StreamChunk], None]
    ) -> None:
        """Entfernt einen WebSocket-Handler."""
        if handler in self.websocket_handlers:
            self.websocket_handlers.remove(handler)
            self.queen_logger.info("WebSocket-Handler entfernt")

    def emit_chunk(self, chunk: StreamChunk) -> None:
        """Sendet einen Chunk an alle WebSocket-Handler."""
        for handler in self.websocket_handlers:
            try:
                handler(chunk)
            except Exception as e:
                self.queen_logger.error(
                    f"Fehler im WebSocket-Handler: {e}"
                )

    async def chat_response_stream_websocket(
        self,
        user_message: str,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        **kwargs
    ) -> None:
        """
        Generiert eine gestreamte Chat-Antwort und sendet sie über WebSocket.

        Args:
            user_message: Nachricht des Benutzers
            user_id: Optionaler Benutzer-Identifier
            conversation_id: Optionaler Konversations-Identifier
            **kwargs: Zusätzliche Parameter
        """
        # WebSocket-Handler für Streaming verwenden
        async for chunk in self.chat_response_stream(
            user_message=user_message,
            user_id=user_id,
            conversation_id=conversation_id,
            on_chunk=self.emit_chunk,
            **kwargs
        ):
            # Chunks werden bereits über emit_chunk gesendet
            pass

    async def start_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        initial_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Startet eine neue Konversation mit der Queen.

        Args:
            user_id: Benutzer-Identifier
            conversation_id: Optionaler Konversations-Identifier
            initial_message: Optionale Startnachricht

        Returns:
            Dictionary mit Konversations-Informationen
        """
        if not self.is_queen_active:
            raise Exception("Queen ist nicht aktiv")

        # Konversation zur Erinnerung hinzufügen
        if initial_message:
            self._add_to_memory(
                "user", initial_message, user_id, conversation_id
            )

        self.total_conversations += 1

        welcome_message = {
            "queen_name": "Queen",
            "message": (
                "Willkommen! Ich bin Queen, deine weise Assistentin. "
                "Wie kann ich dir heute helfen?"
            ),
            "conversation_id": conversation_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "style": self.response_style
        }

        self.queen_logger.info(
            f"Neue Konversation gestartet mit {user_id}"
        )
        return welcome_message

    async def end_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        farewell_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Beendet eine Konversation mit der Queen.

        Args:
            user_id: Benutzer-Identifier
            conversation_id: Optionaler Konversations-Identifier
            farewell_message: Optionale Abschiedsnachricht

        Returns:
            Dictionary mit Abschieds-Informationen
        """
        if not self.is_queen_active:
            raise Exception("Queen ist nicht aktiv")

        # Abschiedsnachricht generieren
        if not farewell_message:
            farewell_message = (
                "Es war mir eine Freude, dir zu helfen! Bis zum nächsten Mal!"
            )

        # Konversation aus der Erinnerung entfernen
        self._clear_conversation_memory(user_id, conversation_id)

        farewell_data = {
            "queen_name": "Queen",
            "message": farewell_message,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "style": self.response_style
        }

        self.queen_logger.info(f"Konversation mit {user_id} beendet")
        return farewell_data

    def _add_to_memory(
        self,
        role: str,
        content: str,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ):
        """Fügt eine Nachricht zur Konversationserinnerung hinzu."""
        memory_entry = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "conversation_id": conversation_id
        }

        self.conversation_memory.append(memory_entry)

        # Erinnerung auf maximale Größe begrenzen
        if len(self.conversation_memory) > self.memory_size:
            self.conversation_memory.pop(0)

    def _clear_conversation_memory(
        self, user_id: str, conversation_id: Optional[str] = None
    ):
        """Entfernt Konversationserinnerungen für einen bestimmten Benutzer."""
        if conversation_id:
            # Spezifische Konversation entfernen
            self.conversation_memory = [
                msg for msg in self.conversation_memory
                if not (
                    msg.get("user_id") == user_id
                    and msg.get("conversation_id") == conversation_id
                )
            ]
        else:
            # Alle Nachrichten des Benutzers entfernen
            self.conversation_memory = [
                msg for msg in self.conversation_memory
                if msg.get("user_id") != user_id
            ]

    def _enhance_system_prompt(self, user_message: str) -> str:
        """Erweitert den System-Prompt basierend auf der Benutzernachricht."""
        base_prompt = (
            self.config.system_prompt
            or "Du bist die Queen - eine weise, freundliche und "
            "hilfreiche Assistentin."
        )

        # Stil-spezifische Anpassungen
        style_enhancements = {
            "friendly": "Antworte in einem freundlichen und warmen Ton.",
            "formal": "Antworte in einem höflichen und formellen Ton.",
            "casual": "Antworte in einem lockeren und entspannten Ton."
        }

        style_prompt = style_enhancements.get(self.response_style, "")

        # Kontext-basierte Anpassungen
        context_enhancement = ""
        if ("programmiere" in user_message.lower()
                or "code" in user_message.lower()
                or "python" in user_message.lower()):
            context_enhancement = (
                " Du bist auch eine Expertin für Programmierung und "
                "Software-Entwicklung."
            )
        elif ("wissenschaft" in user_message.lower()
              or "forschung" in user_message.lower()
              or "physik" in user_message.lower()):
            context_enhancement = (
                " Du bist auch eine Expertin für Wissenschaft und Forschung."
            )

        enhanced_prompt = (
            f"{base_prompt} {style_prompt} {context_enhancement}"
        ).strip()
        return enhanced_prompt

    def get_queen_status(self) -> Dict[str, Any]:
        """Gibt den aktuellen Status der Queen zurück."""
        return {
            "queen_name": "Queen",
            "is_active": self.is_queen_active,
            "total_conversations": self.total_conversations,
            "total_responses": self.total_responses,
            "memory_size": len(self.conversation_memory),
            "response_style": self.response_style,
            "context_awareness": self.context_awareness,
            "model": self.model,
            "timestamp": datetime.now().isoformat()
        }

    def update_queen_style(self, new_style: str):
        """Aktualisiert den Antwortstil der Queen."""
        valid_styles = ["friendly", "formal", "casual"]
        if new_style in valid_styles:
            self.response_style = new_style
            self.queen_logger.info(
                f"Queen-Stil auf '{new_style}' geändert"
            )
        else:
            raise ValueError(
                f"Ungültiger Stil. Gültige Stile: {valid_styles}"
            )

    async def cleanup(self) -> None:
        """Bereinigt Queen-spezifische Ressourcen."""
        self.is_queen_active = False
        self.conversation_memory.clear()
        self.queen_logger.info("Queen-Agent bereinigt")

        # Basis-Bereinigung durchführen
        await super().cleanup()

    def __str__(self) -> str:
        return (
            f"QueenAgent(name={self.name}, style={self.response_style}, "
            f"active={self.is_queen_active})"
        )

    def __repr__(self) -> str:
        return self.__str__()


# Factory-Funktion für den Queen-Agenten
async def get_queen_instance(
    config: Optional[QueenConfig] = None
) -> QueenAgent:
    """
    Factory-Funktion für den Queen-Agenten.

    Args:
        config: Optional - Queen-Konfiguration

    Returns:
        QueenAgent-Instanz
    """
    queen = QueenAgent(config)
    if not queen.is_queen_active:
        await queen.initialize()
    return queen
