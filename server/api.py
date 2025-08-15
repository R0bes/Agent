"""
API-Endpunkte und WebSocket-Logik für das Chat-Backend.
Enthält alle HTTP- und WebSocket-Routen.
Integriert mit dem globalen Event-Handling-System.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from datetime import datetime
import json
import logging
import asyncio
from typing import Optional

from core import manager, ChatResponse
from tasks.engine import TaskEngine
from tasks.message_tasks import MessageTaskFactory
from tasks.console_worker import ConsoleWorker
from agents.queen_agent import get_queen_instance

# Logger für API-Modul
logger = logging.getLogger(__name__)

# Globale Task Engine Instanz
task_engine: Optional[TaskEngine] = None
# Console Worker für Task-Ausgaben
console_worker: Optional[ConsoleWorker] = None


def create_app() -> FastAPI:
    """
    Erstellt und konfiguriert die FastAPI-Anwendung.
    
    Returns:
        Konfigurierte FastAPI-App
    """
    app = FastAPI(
        title="Chat Backend",
        description="Ein Chat-Backend mit WebSocket-Unterstützung und Agent-Integration",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    return app


# FastAPI App erstellen
app = create_app()


@app.on_event("startup")
async def startup_event():
    """Wird beim Start der Anwendung ausgeführt."""
    global task_engine, console_worker
    
    # Console Worker erstellen
    console_worker = ConsoleWorker(verbose=True)
    
    # Task Engine starten
    task_engine = TaskEngine(max_workers=4, queue_size=1000)
    
    # Console Worker als Callback für die Task Engine registrieren
    task_engine.set_callbacks(
        on_task_completed=console_worker.on_task_completed,
        on_task_failed=console_worker.on_task_failed
    )
    
    # Message Handler registrieren
    task_engine.event_manager.register_message_handler("message", handle_chat_message_event)
    task_engine.event_manager.register_message_handler("ping", handle_ping_message_event)
    task_engine.event_manager.register_message_handler("status", handle_status_message_event)
    
    # Task Engine starten
    await task_engine.start()
    
    # Willkommensnachricht auf der Konsole ausgeben
    print("\n" + "="*60)
    print("🚀 CHAT BACKEND MIT GLOBALEM EVENT-HANDLING GESTARTET")
    print("="*60)
    print("📨 API empfängt Nachrichten und packt sie in die Queue")
    print("👑 Task Engine Queen holt Tasks aus der Queue und verarbeitet sie")
    print("📊 Console Worker zeigt alle Ergebnisse an")
    print("="*60)
    
    logger.info("Task Engine erfolgreich gestartet")


@app.on_event("shutdown")
async def shutdown_event():
    """Wird beim Herunterfahren der Anwendung ausgeführt."""
    global task_engine, console_worker
    
    if task_engine:
        await task_engine.stop()
        logger.info("Task Engine erfolgreich gestoppt")
    
    if console_worker:
        console_worker.print_stats()
        print("\n👋 Chat Backend wird beendet...")


# ============================================================================
# HTTP ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root-Endpoint mit API-Informationen."""
    return {
        "message": "Chat Backend API",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/chat",
            "chat_stream": "/chat/stream",
            "websocket": "/ws/{client_id}",
            "docs": "/docs"
        }
    }


@app.post("/chat")
async def chat_endpoint(request: dict):
    """
    Normaler Chat-Endpoint.
    Queen generiert komplette Antwort und sendet sie zurück.
    """
    try:
        content = request.get("content", "")
        user_id = request.get("user_id", "anonymous")
        
        # Queen für Chat-Antwort verwenden
        queen = await get_queen_instance()
        response = await queen.chat_response(
            user_message=content,
            user_id=user_id,
            conversation_id=f"http_{datetime.now().timestamp()}"
        )
        
        return {
            "type": "chat_response",
            "content": response["response"],
            "timestamp": datetime.now().isoformat(),
            "model": response.get("model", "unknown")
        }
        
    except Exception as e:
        logger.error(f"Fehler im Chat-Endpoint: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Fehler bei der Verarbeitung: {str(e)}"}
        )


@app.post("/chat/stream")
async def chat_stream_endpoint(request: dict):
    """
    Streaming Chat-Endpoint.
    Queen generiert Antwort Token für Token.
    """
    try:
        content = request.get("content", "")
        user_id = request.get("user_id", "anonymous")
        
        # Queen für Streaming-Antwort verwenden
        queen = await get_queen_instance()
        
        # Streaming-Antwort generieren
        async def generate_stream():
            async for chunk in queen.chat_response_stream(
                user_message=content,
                user_id=user_id,
                conversation_id=f"stream_{datetime.now().timestamp()}"
            ):
                yield f"data: {json.dumps(chunk.dict())}\n\n"
        
        return generate_stream()
        
    except Exception as e:
        logger.error(f"Fehler im Streaming-Chat-Endpoint: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Fehler bei der Verarbeitung: {str(e)}"}
        )


# ============================================================================
# WEBSOCKET ENDPOINTS
# ============================================================================

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket-Endpoint für Chat-Verbindungen.
    Unterstützt normale und Streaming-Nachrichten.
    """
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Nachricht vom Client empfangen
            data = await websocket.receive_text()
            
            try:
                # JSON parsen und validieren
                message_data = json.loads(data)
                message_type = message_data.get("type", "message")
                
                if message_type == "message":
                    # Normale Chat-Nachricht
                    await handle_normal_chat_message(websocket, client_id, message_data)
                elif message_type == "stream_request":
                    # Streaming-Chat-Nachricht
                    await handle_streaming_chat_message(websocket, client_id, message_data)
                elif message_type == "ping":
                    # Ping-Nachricht
                    await handle_ping_message(websocket, client_id, message_data)
                elif message_type == "status":
                    # Status-Nachricht
                    await handle_status_message(websocket, client_id, message_data)
                else:
                    # Unbekannter Nachrichtentyp
                    await send_error_response(websocket, f"Unbekannter Nachrichtentyp: {message_type}")
                    
            except json.JSONDecodeError:
                await send_error_response(websocket, "Ungültiges JSON-Format")
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in websocket connection for {client_id}: {e}")
        manager.disconnect(client_id)


# ============================================================================
# WEBSOCKET MESSAGE HANDLERS
# ============================================================================

async def handle_normal_chat_message(websocket: WebSocket, client_id: str, message_data: dict):
    """Behandelt normale Chat-Nachrichten (nicht-Streaming)."""
    try:
        content = message_data.get("content", "")
        
        # Queen für Chat-Antwort verwenden
        queen = await get_queen_instance()
        response = await queen.chat_response(
            user_message=content,
            user_id=client_id,
            conversation_id=f"ws_{datetime.now().timestamp()}"
        )
        
        # Antwort über WebSocket senden
        response_message = {
            "type": "message",
            "content": response["response"],
            "timestamp": datetime.now().isoformat(),
            "model": response.get("model", "unknown")
        }
        
        await websocket.send_text(json.dumps(response_message))
        logger.info(f"Normale Chat-Antwort für Client {client_id} gesendet")
        
    except Exception as e:
        logger.error(f"Fehler bei normaler Chat-Nachricht für Client {client_id}: {e}")
        await send_error_response(websocket, f"Fehler bei der Verarbeitung: {str(e)}")


async def handle_streaming_chat_message(websocket: WebSocket, client_id: str, message_data: dict):
    """Behandelt Streaming-Chat-Nachrichten."""
    try:
        content = message_data.get("content", "")
        stream_id = f"stream_{client_id}_{datetime.now().timestamp()}"
        
        # Streaming-Start-Nachricht senden
        start_message = {
            "type": "streaming_start",
            "streamId": stream_id,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_text(json.dumps(start_message))
        
        # Queen für Streaming-Antwort verwenden
        queen = await get_queen_instance()
        
        try:
            # Streaming-Antwort generieren und Token für Token senden
            async for chunk in queen.chat_response_stream(
                user_message=content,
                user_id=client_id,
                conversation_id=stream_id
            ):
                # Jeden Token über WebSocket senden
                token_message = {
                    "type": "streaming_token",
                    "streamId": stream_id,
                    "content": chunk.content,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(token_message))
            
            # Streaming-Ende-Nachricht senden
            end_message = {
                "type": "streaming_end",
                "streamId": stream_id,
                "content": "Streaming abgeschlossen",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(end_message))
            
            logger.info(f"Streaming-Chat für Client {client_id} abgeschlossen")
            
        except Exception as stream_error:
            logger.error(f"Streaming-Fehler für Client {client_id}: {stream_error}")
            
            # Fallback: Normale Antwort senden
            response = await queen.chat_response(
                user_message=content,
                user_id=client_id,
                conversation_id=stream_id
            )
            
            # Normale Antwort senden
            normal_message = {
                "type": "message",
                "content": response["response"],
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(normal_message))
        
    except Exception as e:
        logger.error(f"Fehler bei Streaming-Chat für Client {client_id}: {e}")
        await send_error_response(websocket, f"Fehler bei der Verarbeitung: {str(e)}")


async def handle_ping_message(websocket: WebSocket, client_id: str, message_data: dict):
    """Behandelt Ping-Nachrichten."""
    try:
        pong_message = {
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_text(json.dumps(pong_message))
        
    except Exception as e:
        logger.error(f"Fehler bei Ping-Nachricht für Client {client_id}: {e}")


async def handle_status_message(websocket: WebSocket, client_id: str, message_data: dict):
    """Behandelt Status-Nachrichten."""
    try:
        status_message = {
            "type": "status_response",
            "timestamp": datetime.now().isoformat(),
            "system_status": "online"
        }
        await websocket.send_text(json.dumps(status_message))
        
    except Exception as e:
        logger.error(f"Fehler bei Status-Nachricht für Client {client_id}: {e}")


async def send_error_response(websocket: WebSocket, error_message: str):
    """Sendet eine Fehlermeldung über WebSocket."""
    try:
        error_data = {
            "type": "error",
            "content": error_message,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_text(json.dumps(error_data))
    except Exception as e:
        logger.error(f"Konnte Fehlermeldung nicht senden: {e}")


# ============================================================================
# LEGACY EVENT HANDLERS (für Kompatibilität)
# ============================================================================

def handle_chat_message_event(message_event):
    """Handler für Chat-Nachrichten-Events (Legacy)."""
    try:
        # Task für Chat-Nachrichtenverarbeitung erstellen
        task = MessageTaskFactory.create_task(message_event)
        
        # Task zur Task Engine hinzufügen
        asyncio.create_task(task_engine.submit_task(task, task.input))
        
        logger.info(f"Chat-Nachrichten-Task für {message_event.client_id} erstellt")
        
    except Exception as e:
        logger.error(f"Fehler beim Erstellen des Chat-Nachrichten-Tasks: {e}")


def handle_ping_message_event(message_event):
    """Handler für Ping-Nachrichten-Events (Legacy)."""
    try:
        # Task für Ping-Nachrichtenverarbeitung erstellen
        task = MessageTaskFactory.create_task(message_event)
        
        # Task zur Task Engine hinzufügen
        asyncio.create_task(task_engine.submit_task(task, task.input))
        
        logger.debug(f"Ping-Nachrichten-Task für {message_event.event_id} erstellt")
        
    except Exception as e:
        logger.error(f"Fehler beim Erstellen des Ping-Nachrichten-Tasks: {e}")


def handle_status_message_event(message_event):
    """Handler für Status-Nachrichten-Events (Legacy)."""
    try:
        # Task für Status-Nachrichtenverarbeitung erstellen
        task = MessageTaskFactory.create_task(message_event)
        
        # Task zur Task Engine hinzufügen
        asyncio.create_task(task_engine.submit_task(task, task.input))
        
        logger.debug(f"Status-Nachrichten-Task für {message_event.event_id} erstellt")
        
    except Exception as e:
        logger.error(f"Fehler beim Erstellen des Status-Nachrichten-Tasks: {e}")
