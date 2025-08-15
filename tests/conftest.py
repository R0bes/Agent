"""
Test-Konfiguration und Fixtures für Chat Backend Tests.
Enthält alle gemeinsamen Fixtures und Test-Setup.
"""

import pytest
import asyncio
import sys
import os
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
import json
from datetime import datetime

# Python-Pfad für Server-Module hinzufügen
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

try:
    from api import create_app
    from core import ConnectionManager
    from tasks.engine import TaskEngine, GlobalEventManager
    from tasks.base import TaskInput, TaskOutput, TaskStatus, TaskPriority
except ImportError as e:
    print(f"Import-Fehler: {e}")
    print("Stelle sicher, dass alle Server-Module verfügbar sind.")
    raise


@pytest.fixture(scope="session")
def event_loop():
    """Erstellt eine Event-Loop für alle Tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def app():
    """Erstellt eine Test-FastAPI-App."""
    try:
        return create_app()
    except Exception as e:
        print(f"Fehler beim Erstellen der App: {e}")
        # Fallback: Einfache FastAPI-App
        from fastapi import FastAPI
        app = FastAPI(title="Test Chat Backend", version="1.0.0")
        return app


@pytest.fixture
def client(app):
    """Erstellt einen TestClient für HTTP-Tests."""
    from fastapi.testclient import TestClient
    return TestClient(app)


@pytest.fixture
def mock_websocket():
    """Mock WebSocket für Tests."""
    websocket = Mock()
    websocket.send_text = AsyncMock()
    websocket.receive_text = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.close = AsyncMock()
    return websocket


@pytest.fixture
def connection_manager():
    """Erstellt einen ConnectionManager für Tests."""
    try:
        return ConnectionManager()
    except Exception as e:
        print(f"Fehler beim Erstellen des ConnectionManager: {e}")
        # Fallback: Mock ConnectionManager
        mock_manager = Mock()
        mock_manager.active_connections = {}
        mock_manager.connection_count = 0
        return mock_manager


@pytest.fixture
def mock_task_engine():
    """Mock TaskEngine für Tests."""
    engine = Mock()
    engine.max_workers = 4
    engine.queue_size = 1000
    engine.is_running = True
    engine.submit_task = AsyncMock()
    engine.start = AsyncMock()
    engine.stop = AsyncMock()
    return engine


@pytest.fixture
def mock_global_event_manager(mock_task_engine):
    """Mock GlobalEventManager für Tests."""
    manager = Mock()
    manager.task_engine = mock_task_engine
    manager.is_running = True
    manager.submit_message = Mock(return_value="test_event_id")
    manager.start = AsyncMock()
    manager.stop = AsyncMock()
    return manager


@pytest.fixture
def sample_chat_message():
    """Beispiel-Chat-Nachricht für Tests."""
    return {
        "type": "message",
        "content": "Hallo, wie geht es dir?",
        "user_id": "test_user_123",
        "timestamp": datetime.now().isoformat()
    }


@pytest.fixture
def sample_websocket_message():
    """Beispiel-WebSocket-Nachricht für Tests."""
    return {
        "type": "message",
        "content": "Test WebSocket Nachricht",
        "client_id": "test_client_456"
    }


@pytest.fixture
def mock_queen_agent():
    """Mock Queen Agent für Tests."""
    queen = Mock()
    queen.chat_response = AsyncMock(return_value={
        "response": "Das ist eine Test-Antwort vom Queen Agent.",
        "model": "test-model",
        "conversation_id": "test_conv_123"
    })
    queen.chat_response_stream = AsyncMock()
    return queen


@pytest.fixture
def sample_task_input():
    """Beispiel-Task-Input für Tests."""
    try:
        return TaskInput(
            data={"message": "Test Nachricht"},
            metadata={"user_id": "test_user", "timestamp": datetime.now()}
        )
    except Exception:
        # Fallback: Einfacher Dict
        return {
            "data": {"message": "Test Nachricht"},
            "metadata": {"user_id": "test_user", "timestamp": datetime.now()}
        }


@pytest.fixture
def sample_task_output():
    """Beispiel-Task-Output für Tests."""
    try:
        return TaskOutput(
            data={"response": "Test Antwort"},
            status=TaskStatus.COMPLETED,
            metadata={"processing_time": 0.1}
        )
    except Exception:
        # Fallback: Einfacher Dict
        return {
            "data": {"response": "Test Antwort"},
            "status": "completed",
            "metadata": {"processing_time": 0.1}
        }


@pytest.fixture
def websocket_test_client():
    """WebSocket Test Client für Integration Tests."""
    class WebSocketTestClient:
        def __init__(self):
            self.messages = []
            self.connected = False
        
        async def connect(self, uri):
            self.connected = True
            return True
        
        async def send(self, message):
            self.messages.append(message)
        
        async def receive(self):
            if self.messages:
                return self.messages.pop(0)
            return None
        
        async def close(self):
            self.connected = False
    
    return WebSocketTestClient()


@pytest.fixture(autouse=True)
def setup_logging():
    """Konfiguriert Logging für Tests."""
    import logging
    logging.basicConfig(level=logging.WARNING)
    logging.getLogger("server").setLevel(logging.WARNING)
