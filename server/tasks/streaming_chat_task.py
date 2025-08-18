"""
Streaming Chat Task für die Verarbeitung von Streaming-Chat-Nachrichten.
"""

import logging
import time
import json
from datetime import datetime

from .base import Task, TaskInput, TaskOutput, TaskPriority
from .engine import MessageEvent
from server.agents.queen_agent import get_queen_instance


class StreamingChatMessageTask(Task):
    """
    Task zur Verarbeitung von Chat-Nachrichten mit Streaming.
    Verwendet die Queen's Streaming-Funktionalität für echte Token-Streams.
    """

    def __init__(self, message_event: MessageEvent, websocket_manager=None):
        super().__init__(
            task_id=f"streaming_chat_msg_{message_event.event_id}",
            name="Streaming Chat Message Processing",
            description=f"Verarbeitet Chat-Nachricht mit Streaming von {message_event.client_id}",
            priority=TaskPriority.NORMAL,
        )
        self.message_event = message_event
        self.websocket_manager = websocket_manager
        self.logger = logging.getLogger(f"{__name__}.StreamingChatMessageTask")

    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt die Streaming-Chat-Nachrichtenverarbeitung aus."""
        try:
            self.logger.info(
                f"Verarbeite Streaming-Chat-Nachricht: {self.message_event.event_id}"
            )

            # Nachrichteninhalt extrahieren
            content = self.message_event.message_data.get("content", "")
            client_id = self.message_event.client_id

            # Queen-Instanz abrufen
            queen = await get_queen_instance()

            # Streaming-Start-Nachricht senden
            if self.websocket_manager:
                stream_id = f"stream_{self.message_event.event_id}"
                start_message = {
                    "type": "streaming_start",
                    "streamId": stream_id,
                    "timestamp": datetime.now().isoformat(),
                }
                await self.websocket_manager.send_personal_message(
                    json.dumps(start_message), client_id
                )

                # Streaming-Antwort von der Queen generieren
                try:
                    await queen.chat_response_stream_websocket(
                        user_message=content,
                        user_id=client_id,
                        conversation_id=stream_id,
                    )

                    # Streaming-Ende-Nachricht senden
                    end_message = {
                        "type": "streaming_end",
                        "streamId": stream_id,
                        "content": "Streaming abgeschlossen",
                        "timestamp": datetime.now().isoformat(),
                    }
                    await self.websocket_manager.send_personal_message(
                        json.dumps(end_message), client_id
                    )

                except Exception as stream_error:
                    self.logger.error(f"Streaming-Fehler: {stream_error}")
                    # Fallback: Normale Antwort senden
                    response = await queen.chat_response(
                        user_message=content,
                        user_id=client_id,
                        conversation_id=stream_id,
                    )

                    # Normale Antwort senden
                    normal_message = {
                        "type": "message",
                        "content": response["response"],
                        "timestamp": datetime.now().isoformat(),
                    }
                    await self.websocket_manager.send_personal_message(
                        json.dumps(normal_message), client_id
                    )

            # Ergebnis erstellen
            result = {
                "type": "streaming_chat_response",
                "content": "Streaming abgeschlossen",
                "client_id": client_id,
                "original_message": content,
                "timestamp": datetime.now().isoformat(),
                "processing_time": time.time()
                - self.message_event.timestamp.timestamp(),
            }

            self.logger.info(
                f"Streaming-Chat-Nachricht erfolgreich verarbeitet: {self.message_event.event_id}"
            )

            return TaskOutput(result=result, success=True)

        except Exception as e:
            error_msg = (
                f"Fehler bei der Verarbeitung der Streaming-Chat-Nachricht: {str(e)}"
            )
            self.logger.error(error_msg)

            return TaskOutput(result=None, success=False, error=error_msg)
