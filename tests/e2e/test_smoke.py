"""
E2E Smoke Tests für Chat Backend.
Testet die wichtigsten User-Journeys und End-to-End-Funktionalität.
"""

import pytest
import asyncio
import json
import time
from unittest.mock import patch, AsyncMock, Mock
from fastapi.testclient import TestClient

from server.api import create_app, app


class TestChatBackendSmoke:
    """Smoke Tests für das Chat Backend."""
    
    @pytest.fixture
    def client(self):
        """TestClient für E2E Tests."""
        from fastapi.testclient import TestClient
        from server.api import app
        return TestClient(app)
    
    @pytest.fixture
    def mock_queen_agent(self):
        """Mock Queen Agent für E2E Tests."""
        queen = Mock()
        queen.chat_response = AsyncMock(return_value={
            "response": "Das ist eine Test-Antwort vom Queen Agent für E2E Tests.",
            "model": "e2e-test-model",
            "conversation_id": "e2e_conv_123"
        })
        
        # Mock Streaming-Response
        async def mock_stream():
            yield Mock(content="Token1", dict=lambda: {"content": "Token1"})
            yield Mock(content="Token2", dict=lambda: {"content": "Token2"})
            yield Mock(content="Token3", dict=lambda: {"content": "Token3"})
        
        queen.chat_response_stream = mock_stream
        return queen
    
    def test_root_endpoint_smoke(self, client):
        """Smoke Test für Root-Endpoint."""
        # Test des Root-Endpoints
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "endpoints" in data
        assert data["message"] == "Chat Backend API"
        assert data["version"] == "1.0.0"
        
        print("✅ Root-Endpoint funktioniert")
    
    @patch('server.api.get_queen_instance')
    def test_chat_endpoint_smoke(self, mock_get_queen, client, mock_queen_agent):
        """Smoke Test für Chat-Endpoint."""
        mock_get_queen.return_value = mock_queen_agent
        
        # Einfache Chat-Anfrage
        request_data = {
            "content": "Hallo, das ist ein E2E Test!",
            "user_id": "e2e_test_user"
        }
        
        response = client.post("/chat", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["type"] == "chat_response"
        assert "content" in data
        assert "timestamp" in data
        assert "model" in data
        
        print(f"✅ Chat-Endpoint funktioniert: {data['content'][:50]}...")
    
    @patch('server.api.get_queen_instance')
    def test_chat_stream_endpoint_smoke(self, mock_get_queen, client, mock_queen_agent):
        """Smoke Test für Streaming-Chat-Endpoint."""
        mock_get_queen.return_value = mock_queen_agent
        
        request_data = {
            "content": "Streaming E2E Test",
            "user_id": "e2e_stream_user"
        }
        
        response = client.post("/chat/stream", json=request_data)
        assert response.status_code == 200
        
        print("✅ Streaming-Chat-Endpoint funktioniert")
    
    @patch('server.api.get_queen_instance')
    def test_chat_endpoint_error_handling_smoke(self, mock_get_queen, client):
        """Smoke Test für Fehlerbehandlung im Chat-Endpoint."""
        # Queen Agent mit Exception
        mock_get_queen.side_effect = Exception("E2E Test Exception")
        
        request_data = {
            "content": "Test mit Fehler",
            "user_id": "e2e_error_user"
        }
        
        response = client.post("/chat", json=request_data)
        assert response.status_code == 500
        
        data = response.json()
        assert "error" in data
        assert "E2E Test Exception" in data["error"]
        
        print("✅ Chat-Endpoint Fehlerbehandlung funktioniert")
    
    def test_api_documentation_smoke(self, client):
        """Smoke Test für API-Dokumentation."""
        # OpenAPI Docs
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        
        # ReDoc
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        
        print("✅ API-Dokumentation ist verfügbar")
    
    @patch('server.api.get_queen_instance')
    def test_chat_conversation_flow_smoke(self, mock_get_queen, client, mock_queen_agent):
        """Smoke Test für kompletten Chat-Gesprächsablauf."""
        mock_get_queen.return_value = mock_queen_agent
        
        # Mehrere Chat-Nachrichten in Folge
        conversation_messages = [
            "Hallo, wie geht es dir?",
            "Das ist eine Folgenachricht.",
            "Und hier ist die dritte Nachricht.",
            "Abschließende Nachricht des Tests."
        ]
        
        responses = []
        for i, message in enumerate(conversation_messages):
            request_data = {
                "content": message,
                "user_id": f"conversation_user_{i}"
            }
            
            response = client.post("/chat", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            responses.append(data)
            
            # Kurz warten zwischen Nachrichten
            time.sleep(0.1)
        
        # Überprüfen, dass alle Antworten erfolgreich waren
        assert len(responses) == len(conversation_messages)
        for response in responses:
            assert response["type"] == "chat_response"
            assert "content" in response
        
        print(f"✅ Chat-Gesprächsablauf funktioniert: {len(responses)} Nachrichten verarbeitet")
    
    @patch('server.api.get_queen_instance')
    def test_multiple_users_smoke(self, mock_get_queen, client, mock_queen_agent):
        """Smoke Test für mehrere Benutzer gleichzeitig."""
        mock_get_queen.return_value = mock_queen_agent
        
        # Mehrere Benutzer simulieren
        users = ["user_1", "user_2", "user_3", "user_4", "user_5"]
        user_responses = {}
        
        for user_id in users:
            request_data = {
                "content": f"Nachricht von {user_id}",
                "user_id": user_id
            }
            
            response = client.post("/chat", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            user_responses[user_id] = data
        
        # Überprüfen, dass alle Benutzer Antworten erhalten haben
        assert len(user_responses) == len(users)
        for user_id, response in user_responses.items():
            assert response["type"] == "chat_response"
            assert "content" in response
        
        print(f"✅ Mehrere Benutzer funktionieren: {len(users)} Benutzer getestet")
    
    @patch('server.api.get_queen_instance')
    def test_chat_content_variations_smoke(self, mock_get_queen, client, mock_queen_agent):
        """Smoke Test für verschiedene Chat-Inhalte."""
        mock_get_queen.return_value = mock_queen_agent
        
        # Verschiedene Nachrichtentypen testen
        test_messages = [
            "Einfache Textnachricht",
            "Nachricht mit Zahlen: 12345",
            "Nachricht mit Sonderzeichen: !@#$%^&*()",
            "Nachricht mit Umlauten: äöüß",
            "Nachricht mit Emojis: 🎉🚀💻",
            "Nachricht mit Leerzeichen am Anfang und Ende: ",
            "",  # Leere Nachricht
            "A" * 100,  # Lange Nachricht
            "Kurze",  # Kurze Nachricht
        ]
        
        successful_responses = 0
        for message in test_messages:
            try:
                request_data = {
                    "content": message,
                    "user_id": "content_test_user"
                }
                
                response = client.post("/chat", json=request_data)
                if response.status_code == 200:
                    successful_responses += 1
                
            except Exception as e:
                print(f"Fehler bei Nachricht: '{message[:20]}...': {e}")
        
        # Mindestens 80% der Nachrichten sollten erfolgreich sein
        success_rate = successful_responses / len(test_messages)
        assert success_rate >= 0.8, f"Erfolgsrate zu niedrig: {success_rate:.2%}"
        
        print(f"✅ Chat-Inhalte funktionieren: {successful_responses}/{len(test_messages)} erfolgreich ({success_rate:.1%})")
    
    def test_api_response_format_smoke(self, client):
        """Smoke Test für API-Antwortformate."""
        with patch('server.api.get_queen_instance') as mock_get_queen:
            # Mock Queen Agent
            queen = Mock()
            queen.chat_response = AsyncMock(return_value={
                "response": "Format-Test-Antwort",
                "model": "format-test-model",
                "conversation_id": "format_conv_123"
            })
            mock_get_queen.return_value = queen
            
            # Chat-Anfrage
            request_data = {
                "content": "Format-Test",
                "user_id": "format_test_user"
            }
            
            response = client.post("/chat", json=request_data)
            assert response.status_code == 200
            
            # Überprüfen der Antwortstruktur
            data = response.json()
            required_fields = ["type", "content", "timestamp", "model"]
            
            for field in required_fields:
                assert field in data, f"Feld '{field}' fehlt in der Antwort"
            
            # Überprüfen der Datentypen
            assert isinstance(data["type"], str)
            assert isinstance(data["content"], str)
            assert isinstance(data["timestamp"], str)
            assert isinstance(data["model"], str)
            
            # Überprüfen der Timestamp-Format
            try:
                import datetime
                datetime.datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
            except ValueError:
                pytest.fail(f"Ungültiges Timestamp-Format: {data['timestamp']}")
            
            print("✅ API-Antwortformate sind korrekt")
    
    @patch('server.api.get_queen_instance')
    def test_chat_endpoint_performance_smoke(self, mock_get_queen, client, mock_queen_agent):
        """Smoke Test für Chat-Endpoint-Performance."""
        mock_get_queen.return_value = mock_queen_agent
        
        # Performance-Test mit mehreren Anfragen
        num_requests = 10
        start_time = time.time()
        
        for i in range(num_requests):
            request_data = {
                "content": f"Performance-Test-Nachricht {i}",
                "user_id": f"perf_user_{i}"
            }
            
            response = client.post("/chat", json=request_data)
            assert response.status_code == 200
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Performance-Anforderungen: 10 Anfragen in <5s
        assert total_time < 5.0, f"Performance zu langsam: {total_time:.2f}s für {num_requests} Anfragen"
        
        avg_time = total_time / num_requests
        requests_per_second = num_requests / total_time
        
        print(f"✅ Chat-Endpoint-Performance: {avg_time:.3f}s pro Anfrage, {requests_per_second:.1f} Anfragen/s")
    
    def test_api_health_smoke(self, client):
        """Smoke Test für API-Gesundheit."""
        # Root-Endpoint sollte schnell antworten
        start_time = time.time()
        response = client.get("/")
        end_time = time.time()
        
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0, f"API zu langsam: {response_time:.3f}s"
        
        print(f"✅ API-Gesundheit: Root-Endpoint antwortet in {response_time:.3f}s")


class TestWebSocketSmoke:
    """Smoke Tests für WebSocket-Funktionalität."""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_smoke(self):
        """Smoke Test für WebSocket-Verbindungen."""
        from server.core import ConnectionManager
        
        # Connection Manager erstellen
        manager = ConnectionManager()
        
        # Mock WebSocket
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        
        # Verbindung testen
        client_id = "websocket_smoke_test_client"
        await manager.connect(websocket, client_id)
        
        assert client_id in manager.active_connections
        assert manager.connection_count == 1
        
        # Verbindung trennen
        manager.disconnect(client_id)
        assert client_id not in manager.active_connections
        assert manager.connection_count == 0
        
        print("✅ WebSocket-Verbindungen funktionieren")
    
    @pytest.mark.asyncio
    async def test_websocket_message_handling_smoke(self):
        """Smoke Test für WebSocket-Nachrichtenverarbeitung."""
        from server.core import ConnectionManager
        
        manager = ConnectionManager()
        
        # Mock WebSocket
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        
        client_id = "message_smoke_test_client"
        await manager.connect(websocket, client_id)
        
        # Nachricht senden
        test_message = "WebSocket Smoke Test Nachricht"
        await manager.send_personal_message(test_message, client_id)
        
        # Überprüfen
        websocket.send_text.assert_called_with(test_message)
        
        manager.disconnect(client_id)
        
        print("✅ WebSocket-Nachrichtenverarbeitung funktioniert")


class TestTaskEngineSmoke:
    """Smoke Tests für Task Engine."""
    
    @pytest.mark.asyncio
    async def test_task_engine_basic_smoke(self):
        """Smoke Test für grundlegende Task Engine-Funktionalität."""
        from server.tasks.engine import TaskEngine
        from server.tasks.base import Task, TaskInput, TaskOutput, TaskStatus, TaskPriority
        
        # Einfache Mock Task
        class SimpleTask(Task):
            def __init__(self, task_id):
                super().__init__(task_id)
                self.executed = False
            
            async def execute(self, input_data):
                self.executed = True
                return TaskOutput(
                    result={"result": f"Task {self.task_id} completed"},
                    success=True
                )
        
        # Task Engine erstellen
        engine = TaskEngine(max_workers=1, queue_size=10)
        
        try:
            # Task Engine starten
            await engine.start()
            assert engine.is_running == True
            
            # Task einreichen
            task = SimpleTask("smoke_test_task")
            task_input = TaskInput(data={"test": "data"})
            
            result = await engine.submit_task(task, task_input)
            assert result is not None
            
            # Warten, bis Task ausgeführt wird
            await asyncio.sleep(0.3)
            
            assert task.executed == True
            
            print("✅ Task Engine grundlegende Funktionalität funktioniert")
            
        finally:
            # Task Engine stoppen
            await engine.stop()
            assert engine.is_running == False


class TestIntegrationSmoke:
    """Integration Smoke Tests."""
    
    @patch('server.api.get_queen_instance')
    def test_full_chat_workflow_smoke(self, mock_get_queen, client):
        """Smoke Test für den kompletten Chat-Workflow."""
        # Mock Queen Agent
        queen = Mock()
        queen.chat_response = AsyncMock(return_value={
            "response": "Vollständiger Workflow-Test erfolgreich!",
            "model": "workflow-test-model",
            "conversation_id": "workflow_conv_123"
        })
        mock_get_queen.return_value = queen
        
        # 1. Root-Endpoint aufrufen
        response = client.get("/")
        assert response.status_code == 200
        
        # 2. Chat-Anfrage senden
        request_data = {
            "content": "Vollständiger Workflow-Test",
            "user_id": "workflow_test_user"
        }
        
        response = client.post("/chat", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["type"] == "chat_response"
        assert "content" in data
        
        # 3. Streaming-Anfrage senden
        response = client.post("/chat/stream", json=request_data)
        assert response.status_code == 200
        
        # 4. API-Dokumentation prüfen
        response = client.get("/docs")
        assert response.status_code == 200
        
        print("✅ Vollständiger Chat-Workflow funktioniert")
    
    @patch('server.api.get_queen_instance')
    def test_error_scenarios_smoke(self, mock_get_queen, client):
        """Smoke Test für Fehlerszenarien."""
        # 1. Ungültige JSON-Anfrage
        response = client.post("/chat", content="invalid json", headers={"Content-Type": "application/json"})
        assert response.status_code == 422  # FastAPI Validierungsfehler
        
        # 2. Queen Agent mit Exception (mit Mock)
        mock_queen = Mock()
        mock_queen.chat_response = AsyncMock(side_effect=Exception("Test Exception"))
        mock_get_queen.return_value = mock_queen
        
        response = client.post("/chat", json={"content": "Test", "user_id": "test"})
        assert response.status_code == 500  # Server-Fehler
        
        print("✅ Fehlerszenarien werden korrekt behandelt")


if __name__ == "__main__":
    # Manueller Smoke Test
    print("🚀 Starte Chat Backend Smoke Tests...")
    
    # App erstellen
    test_app = create_app()
    test_client = TestClient(test_app)
    
    # Einfache Tests ausführen
    try:
        # Root-Endpoint
        response = test_client.get("/")
        print(f"✅ Root-Endpoint: {response.status_code}")
        
        # API-Docs
        response = test_client.get("/docs")
        print(f"✅ API-Docs: {response.status_code}")
        
        print("🎉 Alle Smoke Tests erfolgreich!")
        
    except Exception as e:
        print(f"❌ Smoke Test fehlgeschlagen: {e}")
