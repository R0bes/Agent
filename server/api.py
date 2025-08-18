"""
FastAPI-Anwendung für das Chat-Backend.
"""

import json
import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any, Optional, AsyncIterator
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from core import manager
from tasks.engine import TaskEngine
from tasks.console_worker import ConsoleWorker
from agents.queen_agent import get_queen_instance
from tasks.message_tasks import MessageTaskFactory

logger = logging.getLogger(__name__)

# Module-level reference to the app for engine-only callbacks (no request context)
_app_ref: Optional[FastAPI] = None


# -----------------------------------------------------------------------------
# Lifespan: startup/shutdown
# -----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/Shutdown logic for the Chat Backend using FastAPI lifespan API."""
    # Startup
    app.state.console_worker = ConsoleWorker(verbose=True)
    app.state.task_engine = TaskEngine(max_workers=4, queue_size=1000)

    app.state.task_engine.set_callbacks(
        on_task_completed=app.state.console_worker.on_task_completed,
        on_task_failed=app.state.console_worker.on_task_failed,
    )

    # Register legacy event handlers (engine-driven, not HTTP/WS)
    app.state.task_engine.event_manager.register_message_handler(
        "message", handle_chat_message_event
    )
    app.state.task_engine.event_manager.register_message_handler(
        "ping", handle_ping_message_event
    )
    app.state.task_engine.event_manager.register_message_handler(
        "status", handle_status_message_event
    )

    await app.state.task_engine.start()

    print("\n" + "=" * 60)
    print("🚀 CHAT BACKEND STARTED WITH GLOBAL EVENT HANDLING")
    print("=" * 60)
    print("📨 API receives messages and enqueues them")
    print("👑 Task Engine Queen pulls tasks and processes them")
    print("📊 Console Worker prints results")
    print("=" * 60)

    logger.info("Task Engine started successfully")
    try:
        yield
    finally:
        # Shutdown (guarded in case startup failed halfway)
        task_engine: Optional[TaskEngine] = getattr(app.state, "task_engine", None)
        console_worker: Optional[ConsoleWorker] = getattr(
            app.state, "console_worker", None
        )

        if task_engine:
            await task_engine.stop()
            logger.info("Task Engine stopped successfully")

        if console_worker:
            console_worker.print_stats()
            print("\n👋 Chat Backend shutting down...")


# -----------------------------------------------------------------------------
# Router with all routes (HTTP + WebSocket)
# -----------------------------------------------------------------------------
router = APIRouter()


@router.get("/")
async def root(request: Request):
    """Root endpoint with basic API info."""
    return {
        "message": "Chat Backend API",
        "version": getattr(request.app, "version", "unknown"),
        "endpoints": {
            "chat": "/chat",
            "chat_stream": "/chat/stream",
            "websocket": "/ws/{client_id}",
            "docs": "/docs",
        },
    }


@router.post("/chat")
async def chat_endpoint(request_body: Dict[str, Any]):
    """
    Standard chat endpoint.
    Queen generates a full response and returns it immediately.
    """
    try:
        content = request_body.get("content", "")
        user_id = request_body.get("user_id", "anonymous")

        queen = await get_queen_instance()
        response = await queen.chat_response(
            user_message=content,
            user_id=user_id,
            conversation_id=f"http_{datetime.now().timestamp()}",
        )

        return {
            "type": "chat_response",
            "content": response["response"],
            "timestamp": datetime.now().isoformat(),
            "model": response.get("model", "unknown"),
        }

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"{e}"})


@router.post("/chat/stream")
async def chat_stream_endpoint(request_body: Dict[str, Any]):
    """
    Streaming chat endpoint (SSE).
    Queen generates the answer token-by-token.
    """
    try:
        content = request_body.get("content", "")
        user_id = request_body.get("user_id", "anonymous")
        queen = await get_queen_instance()

        async def event_stream() -> AsyncIterator[bytes]:
            try:
                async for chunk in queen.chat_response_stream(
                    user_message=content,
                    user_id=user_id,
                    conversation_id=f"stream_{datetime.now().timestamp()}",
                ):
                    yield f"data: {json.dumps(chunk.dict())}\n\n".encode("utf-8")
            except Exception as stream_error:
                logger.error(f"Streaming error: {stream_error}", exc_info=True)
                payload = {"type": "error", "content": str(stream_error)}
                yield f"data: {json.dumps(payload)}\n\n".encode("utf-8")

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    except Exception as e:
        logger.error(f"Streaming endpoint error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"{e}"})


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for chat connections.
    Supports normal and streaming messages initiated from the client.
    """
    await manager.connect(websocket, client_id)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                await send_error_response(websocket, "Invalid JSON payload")
                continue

            message_type = message_data.get("type", "message")

            if message_type == "message":
                await handle_normal_chat_message(websocket, client_id, message_data)
            elif message_type == "stream_request":
                await handle_streaming_chat_message(websocket, client_id, message_data)
            elif message_type == "ping":
                await handle_ping_message(websocket, client_id, message_data)
            elif message_type == "status":
                await handle_status_message(websocket, client_id, message_data)
            else:
                await send_error_response(
                    websocket, f"Unknown message type: {message_type}"
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WS error for client {client_id}: {e}", exc_info=True)
        manager.disconnect(client_id)


# -----------------------------------------------------------------------------
# WebSocket message handlers
# -----------------------------------------------------------------------------
async def handle_normal_chat_message(
    websocket: WebSocket, client_id: str, message_data: Dict[str, Any]
):
    """Handle non-streaming chat messages."""
    try:
        content = message_data.get("content", "")
        queen = await get_queen_instance()
        response = await queen.chat_response(
            user_message=content,
            user_id=client_id,
            conversation_id=f"ws_{datetime.now().timestamp()}",
        )

        response_message = {
            "type": "message",
            "content": response["response"],
            "timestamp": datetime.now().isoformat(),
            "model": response.get("model", "unknown"),
        }
        await websocket.send_text(json.dumps(response_message))
        logger.info(f"Sent normal chat response to client {client_id}")

    except Exception as e:
        logger.error(
            f"Error handling normal chat for client {client_id}: {e}", exc_info=True
        )
        await send_error_response(websocket, f"Processing error: {e}")


async def handle_streaming_chat_message(
    websocket: WebSocket, client_id: str, message_data: Dict[str, Any]
):
    """Handle streaming chat messages over WebSocket."""
    try:
        content = message_data.get("content", "")
        stream_id = f"stream_{client_id}_{datetime.now().timestamp()}"

        start_message = {
            "type": "streaming_start",
            "streamId": stream_id,
            "timestamp": datetime.now().isoformat(),
        }
        await websocket.send_text(json.dumps(start_message))

        queen = await get_queen_instance()

        try:
            async for chunk in queen.chat_response_stream(
                user_message=content, user_id=client_id, conversation_id=stream_id
            ):
                token_message = {
                    "type": "streaming_token",
                    "streamId": stream_id,
                    "content": getattr(chunk, "content", None),
                    "timestamp": datetime.now().isoformat(),
                }
                await websocket.send_text(json.dumps(token_message))

            end_message = {
                "type": "streaming_end",
                "streamId": stream_id,
                "content": "Streaming finished",
                "timestamp": datetime.now().isoformat(),
            }
            await websocket.send_text(json.dumps(end_message))
            logger.info(f"Streaming chat finished for client {client_id}")

        except Exception as stream_error:
            logger.error(
                f"Streaming error for client {client_id}: {stream_error}",
                exc_info=True,
            )
            # Fallback to a normal response
            response = await queen.chat_response(
                user_message=content, user_id=client_id, conversation_id=stream_id
            )
            normal_message = {
                "type": "message",
                "content": response["response"],
                "timestamp": datetime.now().isoformat(),
                "model": response.get("model", "unknown"),
            }
            await websocket.send_text(json.dumps(normal_message))

    except Exception as e:
        logger.error(
            f"Error in streaming chat for client {client_id}: {e}", exc_info=True
        )
        await send_error_response(websocket, f"Processing error: {e}")


async def handle_ping_message(
    websocket: WebSocket, client_id: str, message_data: Dict[str, Any]
):
    """Handle ping messages."""
    try:
        await websocket.send_text(
            json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()})
        )
    except Exception as e:
        logger.error(f"Ping handler error for {client_id}: {e}", exc_info=True)


async def handle_status_message(
    websocket: WebSocket, client_id: str, message_data: Dict[str, Any]
):
    """Handle status messages."""
    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "status_response",
                    "timestamp": datetime.now().isoformat(),
                    "system_status": "online",
                }
            )
        )
    except Exception as e:
        logger.error(f"Status handler error for {client_id}: {e}", exc_info=True)


async def send_error_response(websocket: WebSocket, error_message: str):
    """Send an error payload over WebSocket."""
    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "error",
                    "content": error_message,
                    "timestamp": datetime.now().isoformat(),
                }
            )
        )
    except Exception as e:
        logger.error(f"Could not send WS error message: {e}", exc_info=True)


# -----------------------------------------------------------------------------
# Legacy event handlers (engine-driven)
# -----------------------------------------------------------------------------
def _engine_submit_from_event(task_input_event):
    """
    Helper: create a task from event and submit it to the TaskEngine on app.state.
    Runs in the FastAPI event loop via asyncio.create_task.
    """
    try:
        task = MessageTaskFactory.create_task(task_input_event)
        if _app_ref is None:
            raise RuntimeError(
                "App reference not set; did you build the app via create_app()?"
            )

        engine: TaskEngine = _app_ref.state.task_engine
        asyncio.create_task(engine.submit_task(task, task.input))
    except Exception as e:
        logger.error(f"Error creating/submitting task for event: {e}", exc_info=True)


def handle_chat_message_event(message_event):
    """Legacy handler: chat message event -> submit task to engine."""
    _engine_submit_from_event(message_event)


def handle_ping_message_event(message_event):
    """Legacy handler: ping event -> submit task to engine."""
    _engine_submit_from_event(message_event)


def handle_status_message_event(message_event):
    """Legacy handler: status event -> submit task to engine."""
    _engine_submit_from_event(message_event)


# -----------------------------------------------------------------------------
# Application factory
# -----------------------------------------------------------------------------
def create_app() -> FastAPI:
    app = FastAPI(
        title="Chat Backend",
        description="A chat backend with WebSocket support and agent integration",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # include all routes into this app instance
    app.include_router(router)

    # store module-level reference for engine-driven callbacks
    global _app_ref
    _app_ref = app

    return app


# Create a default app instance for production uvicorn entrypoints
app = create_app()
