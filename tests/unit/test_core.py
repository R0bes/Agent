"""
Unit Tests für Core-Komponenten.
Testet Connection Manager, Datenmodelle und WebSocket-Verwaltung.
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from server.core import ConnectionManager, ChatMessage, ChatResponse


class TestChatMessage:
    """Tests für das ChatMessage-Datenmodell."""
    
    def test_chat_message_creation(self):
        """Testet die Erstellung von ChatMessage-Objekten."""
        timestamp = datetime.now()
        message = ChatMessage(
            type="message",
            content="Test Nachricht",
            timestamp=timestamp,
            client_id="test_client_123"
        )
        
        assert message.type == "message"
        assert message.content == "Test Nachricht"
        assert message.timestamp == timestamp
        assert message.client_id == "test_client_123"
    
    def test_chat_message_validation(self):
        """Testet Pydantic-Validierung für ChatMessage."""
        # Gültige Nachricht
        message = ChatMessage(
            type="message",
            content="Valid message",
            timestamp=datetime.now(),
            client_id="valid_client"
        )
        assert message is not None
        
        # Ungültige Nachricht (fehlende Felder)
        with pytest.raises(ValueError):
            ChatMessage(
                type="message",
                content="Invalid message"
                # Fehlende timestamp und client_id
            )
    
    def test_chat_message_edge_cases(self):
        """Testet Edge Cases für ChatMessage."""
        # Leerer Content
        message = ChatMessage(
            type="message",
            content="",
            timestamp=datetime.now(),
            client_id="test_client"
        )
        assert message.content == ""
        
        # Sehr langer Content
        long_content = "A" * 10000
        message = ChatMessage(
            type="message",
            content=long_content,
            timestamp=datetime.now(),
            client_id="test_client"
        )
        assert len(message.content) == 10000
        
        # Spezielle Zeichen im Content
        special_content = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
        message = ChatMessage(
            type="message",
            content=special_content,
            timestamp=datetime.now(),
            client_id="test_client"
        )
        assert message.content == special_content


class TestChatResponse:
    """Tests für das ChatResponse-Datenmodell."""
    
    def test_chat_response_creation(self):
        """Testet die Erstellung von ChatResponse-Objekten."""
        timestamp = datetime.now()
        response = ChatResponse(
            type="response",
            content="Test Antwort",
            timestamp=timestamp
        )
        
        assert response.type == "response"
        assert response.content == "Test Antwort"
        assert response.timestamp == timestamp
    
    def test_chat_response_validation(self):
        """Testet Pydantic-Validierung für ChatResponse."""
        # Gültige Antwort
        response = ChatResponse(
            type="response",
            content="Valid response",
            timestamp=datetime.now()
        )
        assert response is not None
        
        # Ungültige Antwort (fehlende Felder)
        with pytest.raises(ValueError):
            ChatResponse(
                type="response"
                # Fehlende content und timestamp
            )


class TestConnectionManager:
    """Tests für den Connection Manager."""
    
    @pytest.fixture
    def connection_manager(self):
        """Erstellt einen ConnectionManager für Tests."""
        return ConnectionManager()
    
    @pytest.fixture
    def mock_websocket(self):
        """Mock WebSocket für Tests."""
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.close = AsyncMock()
        return websocket
    
    @pytest.mark.asyncio
    async def test_connection_manager_initialization(self, connection_manager):
        """Testet die Initialisierung des Connection Managers."""
        assert connection_manager.active_connections == {}
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_connect_new_client(self, connection_manager, mock_websocket):
        """Testet das Verbinden eines neuen Clients."""
        client_id = "new_client_123"
        
        await connection_manager.connect(mock_websocket, client_id)
        
        assert client_id in connection_manager.active_connections
        assert connection_manager.active_connections[client_id] == mock_websocket
        assert connection_manager.connection_count == 1
        
        # Überprüfe, dass WebSocket akzeptiert wurde
        mock_websocket.accept.assert_called_once()
        
        # Überprüfe, dass Willkommensnachricht gesendet wurde
        mock_websocket.send_text.assert_called_once()
        call_args = mock_websocket.send_text.call_args[0][0]
        welcome_data = json.loads(call_args)
        assert welcome_data["type"] == "system"
        assert "Willkommen" in welcome_data["content"]
        assert client_id in welcome_data["content"]
    
    @pytest.mark.asyncio
    async def test_connect_existing_client_replaces_old(self, connection_manager, mock_websocket):
        """Testet, dass bestehende Client-Verbindungen ersetzt werden."""
        client_id = "existing_client_456"
        old_websocket = Mock()
        old_websocket.send_text = AsyncMock()
        old_websocket.accept = AsyncMock()
        
        # Erste Verbindung
        await connection_manager.connect(old_websocket, client_id)
        assert connection_manager.connection_count == 1
        
        # Zweite Verbindung (ersetzt die erste)
        await connection_manager.connect(mock_websocket, client_id)
        # Der Zähler bleibt bei 1, da wir nur eine Verbindung ersetzen
        assert connection_manager.connection_count == 1
        
        # Überprüfe, dass beide WebSockets akzeptiert wurden
        old_websocket.accept.assert_called_once()
        mock_websocket.accept.assert_called_once()
        
        # Aufräumen
        connection_manager.disconnect(client_id)
        connection_manager.disconnect(client_id)
    
    @pytest.mark.asyncio
    async def test_disconnect_client(self, connection_manager, mock_websocket):
        """Testet das Trennen eines Client."""
        client_id = "client_to_disconnect_789"
        
        # Client verbinden
        await connection_manager.connect(mock_websocket, client_id)
        assert connection_manager.connection_count == 1
        
        # Client trennen
        connection_manager.disconnect(client_id)
        assert client_id not in connection_manager.active_connections
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_client(self, connection_manager):
        """Testet das Trennen eines nicht existierenden Clients."""
        initial_count = connection_manager.connection_count
        
        connection_manager.disconnect("nonexistent_client")
        
        # Zähler sollte unverändert bleiben
        assert connection_manager.connection_count == initial_count
    
    @pytest.mark.asyncio
    async def test_send_personal_message_success(self, connection_manager, mock_websocket):
        """Testet erfolgreiches Senden persönlicher Nachrichten."""
        client_id = "target_client_123"
        message = "Persönliche Test Nachricht"
        
        # Client verbinden
        await connection_manager.connect(mock_websocket, client_id)
        
        # Nachricht senden
        await connection_manager.send_personal_message(message, client_id)
        
        # Überprüfe, dass Nachricht gesendet wurde
        mock_websocket.send_text.assert_called_with(message)
    
    @pytest.mark.asyncio
    async def test_send_personal_message_to_nonexistent_client(self, connection_manager):
        """Testet Senden an nicht existierenden Client."""
        message = "Test Nachricht"
        client_id = "nonexistent_client"
        
        # Sollte keine Exception werfen
        await connection_manager.send_personal_message(message, client_id)
    
    @pytest.mark.asyncio
    async def test_send_personal_message_websocket_error(self, connection_manager, mock_websocket):
        """Testet WebSocket-Fehler beim Senden persönlicher Nachrichten."""
        client_id = "error_client_456"
        message = "Test Nachricht"
        
        # Client verbinden
        await connection_manager.connect(mock_websocket, client_id)
        
        # WebSocket-Fehler simulieren
        mock_websocket.send_text.side_effect = Exception("WebSocket Fehler")
        
        # Nachricht senden (sollte Fehler behandeln und Client trennen)
        await connection_manager.send_personal_message(message, client_id)
        
        # Überprüfe, dass Client getrennt wurde
        assert client_id not in connection_manager.active_connections
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_broadcast_message(self, connection_manager):
        """Testet das Broadcasten von Nachrichten an alle Clients."""
        # Mehrere Clients verbinden
        websocket1 = Mock()
        websocket1.send_text = AsyncMock()
        websocket1.accept = AsyncMock()
        
        websocket2 = Mock()
        websocket2.send_text = AsyncMock()
        websocket2.accept = AsyncMock()
        
        await connection_manager.connect(websocket1, "client1")
        await connection_manager.connect(websocket2, "client2")
        
        # Broadcast-Nachricht
        broadcast_message = "Broadcast Test Nachricht"
        await connection_manager.broadcast(broadcast_message)
        
        # Überprüfe, dass beide Clients die Nachricht erhalten haben
        websocket1.send_text.assert_called_with(broadcast_message)
        websocket2.send_text.assert_called_with(broadcast_message)
    
    @pytest.mark.asyncio
    async def test_broadcast_message_with_disconnected_clients(self, connection_manager):
        """Testet Broadcast mit getrennten Clients."""
        # Client verbinden
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        
        await connection_manager.connect(websocket, "test_client")
        
        # Client trennen
        connection_manager.disconnect("test_client")
        
        # Broadcast-Nachricht (sollte keine Fehler verursachen)
        broadcast_message = "Broadcast nach Disconnect"
        await connection_manager.broadcast(broadcast_message)
        
        # Überprüfe, dass keine Nachricht gesendet wurde
        # Der Websocket wurde bereits bei der Verbindung akzeptiert, daher ist send_text aufgerufen worden
        # Aber nach dem Disconnect sollte keine weitere Nachricht gesendet werden
        assert websocket.send_text.call_count == 1  # Nur die Willkommensnachricht
    
    @pytest.mark.asyncio
    async def test_broadcast_message_empty_connections(self, connection_manager):
        """Testet Broadcast ohne aktive Verbindungen."""
        broadcast_message = "Broadcast ohne Clients"
        
        # Sollte keine Fehler verursachen
        await connection_manager.broadcast(broadcast_message)
    
    @pytest.mark.asyncio
    async def test_multiple_connections_management(self, connection_manager):
        """Testet Verwaltung mehrerer Verbindungen."""
        websockets = []
        client_ids = []
        
        # 5 Clients verbinden
        for i in range(5):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            client_id = f"client_{i}"
            
            await connection_manager.connect(websocket, client_id)
            websockets.append(websocket)
            client_ids.append(client_id)
        
        assert connection_manager.connection_count == 5
        assert len(connection_manager.active_connections) == 5
        
        # Einige Clients trennen
        connection_manager.disconnect("client_1")
        connection_manager.disconnect("client_3")
        
        assert connection_manager.connection_count == 3
        assert "client_1" not in connection_manager.active_connections
        assert "client_3" not in connection_manager.active_connections
        assert "client_0" in connection_manager.active_connections
        assert "client_2" in connection_manager.active_connections
        assert "client_4" in connection_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_connection_manager_concurrent_access(self, connection_manager):
        """Testet gleichzeitigen Zugriff auf Connection Manager."""
        import asyncio
        
        async def connect_client(client_id):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            await connection_manager.connect(websocket, client_id)
            return client_id
        
        async def disconnect_client(client_id):
            connection_manager.disconnect(client_id)
            return client_id
        
        # Gleichzeitig mehrere Clients verbinden
        connect_tasks = [
            connect_client(f"concurrent_client_{i}") 
            for i in range(10)
        ]
        
        results = await asyncio.gather(*connect_tasks)
        assert len(results) == 10
        assert connection_manager.connection_count == 10
        
        # Gleichzeitig mehrere Clients trennen
        disconnect_tasks = [
            disconnect_client(f"concurrent_client_{i}") 
            for i in range(5)
        ]
        
        results = await asyncio.gather(*disconnect_tasks)
        assert len(results) == 5
        assert connection_manager.connection_count == 5
    
    @pytest.mark.asyncio
    async def test_connection_manager_memory_cleanup(self, connection_manager):
        """Testet Speicherbereinigung nach Client-Trennung."""
        # Mehrere Clients verbinden
        for i in range(100):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            await connection_manager.connect(websocket, f"memory_client_{i}")
        
        assert connection_manager.connection_count == 100
        assert len(connection_manager.active_connections) == 100
        
        # Alle Clients trennen
        for i in range(100):
            connection_manager.disconnect(f"memory_client_{i}")
        
        assert connection_manager.connection_count == 0
        assert len(connection_manager.active_connections) == 0
        
        # Überprüfe, dass keine Referenzen übrig bleiben
        import gc
        gc.collect()
        
        # Connection Manager sollte immer noch funktionieren
        assert connection_manager.connection_count == 0


class TestDataModelEdgeCases:
    """Tests für Edge Cases in Datenmodellen."""
    
    def test_chat_message_unicode_content(self):
        """Testet ChatMessage mit Unicode-Content."""
        unicode_content = "🎉 Hello 世界 🌍 Test 123"
        message = ChatMessage(
            type="message",
            content=unicode_content,
            timestamp=datetime.now(),
            client_id="unicode_test_client"
        )
        
        assert message.content == unicode_content
        # Python len() zählt Unicode-Zeichen korrekt als 1
        # "🎉 Hello 世界 🌍 Test 123" hat 21 Zeichen
        assert len(message.content) == 21
    
    def test_chat_message_very_long_client_id(self):
        """Testet ChatMessage mit sehr langer Client-ID."""
        long_client_id = "A" * 1000
        message = ChatMessage(
            type="message",
            content="Test",
            timestamp=datetime.now(),
            client_id=long_client_id
        )
        
        assert message.client_id == long_client_id
        assert len(message.client_id) == 1000
    
    def test_chat_response_empty_content(self):
        """Testet ChatResponse mit leerem Content."""
        response = ChatResponse(
            type="response",
            content="",
            timestamp=datetime.now()
        )
        
        assert response.content == ""
        assert len(response.content) == 0
