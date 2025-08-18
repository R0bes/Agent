"""
Message Tasks für die Verarbeitung von Chat-Nachrichten.
"""

import logging
import time
from datetime import datetime

from .base import Task, TaskInput, TaskOutput, TaskPriority
from .engine import MessageEvent
from server.agents.queen_agent import get_queen_instance


class ChatMessageTask(Task):
    """
    Task zur Verarbeitung von Chat-Nachrichten.
    Verwendet die Queen für echte Chat-Antworten.
    """

    def __init__(self, message_event: MessageEvent):
        super().__init__(
            task_id=f"chat_msg_{message_event.event_id}",
            name="Chat Message Processing",
            description=f"Verarbeitet Chat-Nachricht von {message_event.client_id}",
            priority=TaskPriority.NORMAL,
        )
        self.message_event = message_event
        self.logger = logging.getLogger(f"{__name__}.ChatMessageTask")

    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt die Chat-Nachrichtenverarbeitung aus."""
        try:
            self.logger.info(
                f"Verarbeite Chat-Nachricht: {self.message_event.event_id}"
            )

            # Nachrichteninhalt extrahieren
            content = self.message_event.message_data.get("content", "")
            client_id = self.message_event.client_id

            # Queen für Chat-Antworten verwenden
            try:
                queen = await get_queen_instance()
                response = await queen.chat_response(
                    user_message=content,
                    user_id=client_id,
                    conversation_id=f"conv_{self.message_event.event_id}",
                )
                response_content = response["response"]
            except Exception as e:
                self.logger.error(f"Fehler bei der Queen-Antwort: {e}")
                response_content = f"Fehler bei der Verarbeitung: {str(e)}"

            # Ergebnis erstellen
            result = {
                "type": "chat_response",
                "content": response_content,
                "client_id": client_id,
                "original_message": content,
                "timestamp": datetime.now().isoformat(),
                "processing_time": time.time()
                - self.message_event.timestamp.timestamp(),
            }

            self.logger.info(
                f"Chat-Nachricht erfolgreich verarbeitet: {self.message_event.event_id}"
            )

            return TaskOutput(result=result, success=True)

        except Exception as e:
            error_msg = f"Fehler bei der Verarbeitung der Chat-Nachricht: {str(e)}"
            self.logger.error(error_msg)

            return TaskOutput(result=None, success=False, error=error_msg)


class PingMessageTask(Task):
    """
    Task zur Verarbeitung von Ping-Nachrichten.
    Generiert Pong-Antworten für Ping-Nachrichten.
    """

    def __init__(self, message_event: MessageEvent):
        super().__init__(
            task_id=f"ping_msg_{message_event.event_id}",
            name="Ping Message Processing",
            description=f"Verarbeitet Ping-Nachricht von {message_event.event_id}",
            priority=TaskPriority.LOW,
        )
        self.message_event = message_event
        self.logger = logging.getLogger(f"{__name__}.PingMessageTask")

    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt die Ping-Nachrichtenverarbeitung aus."""
        try:
            self.logger.debug(
                f"Verarbeite Ping-Nachricht: {self.message_event.event_id}"
            )

            client_id = self.message_event.client_id

            # Pong-Antwort generieren
            result = {
                "type": "pong",
                "client_id": client_id,
                "timestamp": datetime.now().isoformat(),
                "response_time": time.time() - self.message_event.timestamp.timestamp(),
            }

            self.logger.debug(
                f"Ping-Nachricht erfolgreich verarbeitet: {self.message_event.event_id}"
            )

            return TaskOutput(result=result, success=True)

        except Exception as e:
            error_msg = f"Fehler bei der Verarbeitung der Ping-Nachricht: {str(e)}"
            self.logger.error(error_msg)

            return TaskOutput(result=None, success=False, error=error_msg)


class StatusMessageTask(Task):
    """
    Task zur Verarbeitung von Status-Anfragen.
    Generiert Status-Antworten mit System-Informationen.
    """

    def __init__(self, message_event: MessageEvent):
        super().__init__(
            task_id=f"status_msg_{message_event.event_id}",
            name="Status Message Processing",
            description=f"Verarbeitet Status-Anfrage von {message_event.client_id}",
            priority=TaskPriority.LOW,
        )
        self.message_event = message_event
        self.logger = logging.getLogger(f"{__name__}.StatusMessageTask")

    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt die Status-Nachrichtenverarbeitung aus."""
        try:
            self.logger.debug(
                f"Verarbeite Status-Anfrage: {self.message_event.event_id}"
            )

            client_id = self.message_event.client_id

            # Status-Informationen sammeln
            # Hier könnten echte System-Informationen abgerufen werden
            result = {
                "type": "status_response",
                "client_id": client_id,
                "timestamp": datetime.now().isoformat(),
                "system_status": "online",
                "active_connections": 0,  # Wird von der API gesetzt
                "active_clients": 0,  # Wird von der API gesetzt
                "queue_size": 0,  # Wird von der Task Engine gesetzt
                "processing_time": time.time()
                - self.message_event.timestamp.timestamp(),
            }

            self.logger.debug(
                f"Status-Anfrage erfolgreich verarbeitet: {self.message_event.event_id}"
            )

            return TaskOutput(result=result, success=True)

        except Exception as e:
            error_msg = f"Fehler bei der Verarbeitung der Status-Anfrage: {str(e)}"
            self.logger.error(error_msg)

            return TaskOutput(result=None, success=False, error=error_msg)


class MessageTaskFactory:
    """
    Factory für die Erstellung von Message-Tasks basierend auf dem Nachrichtentyp.
    """

    @staticmethod
    def create_task(message_event: MessageEvent) -> Task:
        """
        Erstellt einen Task basierend auf dem Nachrichtentyp.

        Args:
            message_event: Das zu verarbeitende Nachrichten-Event

        Returns:
            Passender Task für die Nachrichtenverarbeitung
        """
        message_type = message_event.message_data.get("type", "unknown")

        if message_type == "message":
            return ChatMessageTask(message_event)
        elif message_type == "ping":
            return PingMessageTask(message_event)
        elif message_type == "status":
            return StatusMessageTask(message_event)
        else:
            # Fallback für unbekannte Nachrichtentypen
            return ChatMessageTask(message_event)
