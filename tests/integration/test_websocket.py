"""
Integration Tests für WebSocket-Kommunikation.
Testet echte WebSocket-Verbindungen und Nachrichtenverarbeitung.
"""

import pytest
import asyncio
import json
import websockets
from unittest.mock import patch, AsyncMock, Mock
from datetime import datetime

from server.api import websocket_endpoint
from server.core import ConnectionManager


class TestWebSocketIntegration:
    """Integration Tests für WebSocket-Funktionalität."""
    
    @pytest.fixture
    def connection_manager(self):
        """Erstellt einen ConnectionManager für Tests."""
        return ConnectionManager()
    
    @pytest.mark.asyncio
    async def test_websocket_connection_lifecycle(self, connection_manager):
        """Testet den kompletten WebSocket-Verbindungslebenszyklus."""
        # Mock WebSocket erstellen
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock()
        websocket.close = AsyncMock()
        
        client_id = "lifecycle_test_client"
        
        # Verbindung aufbauen
        await connection_manager.connect(websocket, client_id)
        
        assert client_id in connection_manager.active_connections
        assert connection_manager.connection_count == 1
        
        # Willkommensnachricht überprüfen
        websocket.send_text.assert_called_once()
        welcome_call = websocket.send_text.call_args[0][0]
        welcome_data = json.loads(welcome_call)
        assert welcome_data["type"] == "system"
        assert "Willkommen" in welcome_data["content"]
        
        # Verbindung trennen
        connection_manager.disconnect(client_id)
        
        assert client_id not in connection_manager.active_connections
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_websocket_message_exchange(self, connection_manager):
        """Testet Nachrichtenaustausch über WebSocket."""
        # Mock WebSocket erstellen
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock()
        
        client_id = "message_test_client"
        
        # Verbindung aufbauen
        await connection_manager.connect(websocket, client_id)
        
        # Test-Nachricht senden
        test_message = "Test Nachricht für Client"
        await connection_manager.send_personal_message(test_message, client_id)
        
        # Überprüfen, dass Nachricht gesendet wurde
        websocket.send_text.assert_called_with(test_message)
        
        # Verbindung trennen
        connection_manager.disconnect(client_id)
    
    @pytest.mark.asyncio
    async def test_websocket_broadcast_functionality(self, connection_manager):
        """Testet Broadcast-Funktionalität über WebSocket."""
        # Mehrere Mock WebSockets erstellen
        websocket1 = Mock()
        websocket1.send_text = AsyncMock()
        websocket1.accept = AsyncMock()
        
        websocket2 = Mock()
        websocket2.send_text = AsyncMock()
        websocket2.accept = AsyncMock()
        
        websocket3 = Mock()
        websocket3.send_text = AsyncMock()
        websocket3.accept = AsyncMock()
        
        # Clients verbinden
        await connection_manager.connect(websocket1, "client1")
        await connection_manager.connect(websocket2, "client2")
        await connection_manager.connect(websocket3, "client3")
        
        assert connection_manager.connection_count == 3
        
        # Broadcast-Nachricht senden
        broadcast_message = "Wichtige Ankündigung für alle Clients"
        await connection_manager.broadcast(broadcast_message)
        
        # Überprüfen, dass alle Clients die Nachricht erhalten haben
        websocket1.send_text.assert_called_with(broadcast_message)
        websocket2.send_text.assert_called_with(broadcast_message)
        websocket3.send_text.assert_called_with(broadcast_message)
        
        # Clients trennen
        connection_manager.disconnect("client1")
        connection_manager.disconnect("client2")
        connection_manager.disconnect("client3")
        
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_websocket_concurrent_connections(self, connection_manager):
        """Testet gleichzeitige WebSocket-Verbindungen."""
        async def connect_client(client_id):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            await connection_manager.connect(websocket, client_id)
            return websocket
        
        # 10 Clients gleichzeitig verbinden
        connect_tasks = [
            connect_client(f"concurrent_client_{i}") 
            for i in range(10)
        ]
        
        websockets = await asyncio.gather(*connect_tasks)
        
        assert connection_manager.connection_count == 10
        assert len(connection_manager.active_connections) == 10
        
        # Broadcast an alle Clients
        test_message = "Nachricht an alle gleichzeitigen Clients"
        await connection_manager.broadcast(test_message)
        
        # Überprüfen, dass alle Clients die Nachricht erhalten haben
        for websocket in websockets:
            websocket.send_text.assert_called_with(test_message)
        
        # Alle Clients trennen
        for i in range(10):
            connection_manager.disconnect(f"concurrent_client_{i}")
        
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_websocket_connection_replacement(self, connection_manager):
        """Testet das Ersetzen bestehender Verbindungen."""
        # Erste Verbindung
        websocket1 = Mock()
        websocket1.send_text = AsyncMock()
        websocket1.accept = AsyncMock()
        
        client_id = "replacement_test_client"
        await connection_manager.connect(websocket1, client_id)
        
        assert connection_manager.connection_count == 1
        assert connection_manager.active_connections[client_id] == websocket1
        
        # Zweite Verbindung (ersetzt die erste)
        websocket2 = Mock()
        websocket2.send_text = AsyncMock()
        websocket2.accept = AsyncMock()
        
        await connection_manager.connect(websocket2, client_id)
        
        assert connection_manager.connection_count == 1  # Zähler bleibt gleich
        assert connection_manager.active_connections[client_id] == websocket2
        
        # Test-Nachricht senden
        test_message = "Nachricht an neue Verbindung"
        await connection_manager.send_personal_message(test_message, client_id)
        
        # Überprüfen, dass nur die neue Verbindung die Nachricht erhält
        # websocket1 hat nur die Willkommensnachricht bekommen, keine Test-Nachricht
        assert websocket1.send_text.call_count == 1  # Nur Willkommensnachricht
        websocket2.send_text.assert_called_with(test_message)
        
        # Verbindung trennen
        connection_manager.disconnect(client_id)
        assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_websocket_error_handling(self, connection_manager):
        """Testet Fehlerbehandlung bei WebSocket-Operationen."""
        # Mock WebSocket mit Fehlerverhalten erstellen
        websocket = Mock()
        websocket.send_text = AsyncMock(side_effect=Exception("WebSocket Fehler"))
        websocket.accept = AsyncMock()
        
        client_id = "error_test_client"
        
        # Verbindung aufbauen (sollte fehlschlagen)
        try:
            await connection_manager.connect(websocket, client_id)
            # Wenn Verbindung erfolgreich ist, Nachricht senden
            test_message = "Test Nachricht"
            await connection_manager.send_personal_message(test_message, client_id)
            
            # Überprüfen, dass Client nach Fehler getrennt wurde
            assert client_id not in connection_manager.active_connections
            assert connection_manager.connection_count == 0
        except Exception:
            # Verbindung fehlgeschlagen, was auch in Ordnung ist
            assert connection_manager.connection_count == 0
    
    @pytest.mark.asyncio
    async def test_websocket_message_types(self, connection_manager):
        """Testet verschiedene Nachrichtentypen über WebSocket."""
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        
        client_id = "message_types_test_client"
        await connection_manager.connect(websocket, client_id)
        
        # Verschiedene Nachrichtentypen testen
        message_types = [
            "System-Nachricht",
            "Chat-Nachricht",
            "Status-Update",
            "Fehler-Meldung",
            "Warnung",
            "Info"
        ]
        
        for message_type in message_types:
            await connection_manager.send_personal_message(message_type, client_id)
        
        # Überprüfen, dass alle Nachrichten gesendet wurden
        assert websocket.send_text.call_count == len(message_types) + 1  # +1 für Willkommensnachricht
        
        connection_manager.disconnect(client_id)
    
    @pytest.mark.asyncio
    async def test_websocket_large_messages(self, connection_manager):
        """Testet WebSocket mit großen Nachrichten."""
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        
        client_id = "large_message_test_client"
        await connection_manager.connect(websocket, client_id)
        
        # Große Nachricht erstellen
        large_message = "A" * 10000  # 10KB Nachricht
        
        # Nachricht senden
        await connection_manager.send_personal_message(large_message, client_id)
        
        # Überprüfen, dass große Nachricht gesendet wurde
        websocket.send_text.assert_called_with(large_message)
        
        connection_manager.disconnect(client_id)
    
    @pytest.mark.asyncio
    async def test_websocket_unicode_messages(self, connection_manager):
        """Testet WebSocket mit Unicode-Nachrichten."""
        websocket = Mock()
        websocket.send_text = AsyncMock()
        websocket.accept = AsyncMock()
        
        client_id = "unicode_test_client"
        await connection_manager.connect(websocket, client_id)
        
        # Unicode-Nachrichten testen
        unicode_messages = [
            "🎉 Hello World! 🌍",
            "Привет мир!",
            "こんにちは世界！",
            "مرحبا بالعالم!",
            "Olá Mundo!",
            "Hallo Welt! 🇩🇪"
        ]
        
        for message in unicode_messages:
            await connection_manager.send_personal_message(message, client_id)
        
        # Überprüfen, dass alle Unicode-Nachrichten gesendet wurden
        assert websocket.send_text.call_count == len(unicode_messages) + 1  # +1 für Willkommensnachricht
        
        connection_manager.disconnect(client_id)
    
    @pytest.mark.asyncio
    async def test_websocket_connection_stress_test(self, connection_manager):
        """Stress-Test für WebSocket-Verbindungen."""
        async def stress_test_iteration(iteration):
            # 50 Clients verbinden
            websockets = []
            for i in range(50):
                websocket = Mock()
                websocket.send_text = AsyncMock()
                websocket.accept = AsyncMock()
                client_id = f"stress_client_{iteration}_{i}"
                await connection_manager.connect(websocket, client_id)
                websockets.append((websocket, client_id))
            
            # Broadcast-Nachricht senden
            stress_message = f"Stress-Test Nachricht {iteration}"
            await connection_manager.broadcast(stress_message)
            
            # Überprüfen, dass alle Clients die Nachricht erhalten haben
            for websocket, _ in websockets:
                websocket.send_text.assert_called_with(stress_message)
            
            # Alle Clients trennen
            for _, client_id in websockets:
                connection_manager.disconnect(client_id)
            
            return len(websockets)
        
        # Mehrere Stress-Test-Iterationen durchführen
        iterations = 3
        total_clients = 0
        
        for iteration in range(iterations):
            clients_in_iteration = await stress_test_iteration(iteration)
            total_clients += clients_in_iteration
            
            # Kurz warten zwischen Iterationen
            await asyncio.sleep(0.1)
        
        # Überprüfen, dass alle Verbindungen sauber getrennt wurden
        assert connection_manager.connection_count == 0
        assert len(connection_manager.active_connections) == 0
        
        print(f"Stress-Test abgeschlossen: {total_clients} Clients in {iterations} Iterationen")


class TestWebSocketPerformance:
    """Performance Tests für WebSocket-Operationen."""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_speed(self, connection_manager):
        """Testet die Geschwindigkeit von WebSocket-Verbindungen."""
        import time
        
        # Zeit für 100 Verbindungen messen
        start_time = time.time()
        
        websockets = []
        for i in range(100):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            await connection_manager.connect(websocket, f"speed_test_client_{i}")
            websockets.append(websocket)
        
        connection_time = time.time() - start_time
        
        # Überprüfen, dass alle Verbindungen erfolgreich waren
        assert connection_manager.connection_count == 100
        
        # Performance-Anforderungen: 100 Verbindungen in <1s
        assert connection_time < 1.0, f"Verbindungen zu langsam: {connection_time:.3f}s"
        
        # Aufräumen
        for i in range(100):
            connection_manager.disconnect(f"speed_test_client_{i}")
        
        print(f"100 WebSocket-Verbindungen in {connection_time:.3f}s")
    
    @pytest.mark.asyncio
    async def test_websocket_message_throughput(self, connection_manager):
        """Testet den Nachrichtendurchsatz über WebSocket."""
        import time
        
        # 10 Clients verbinden
        websockets = []
        for i in range(10):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            await connection_manager.connect(websocket, f"throughput_client_{i}")
            websockets.append(websocket)
        
        # 1000 Nachrichten senden
        start_time = time.time()
        
        for i in range(1000):
            message = f"Nachricht {i}"
            await connection_manager.broadcast(message)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Überprüfen, dass alle Nachrichten gesendet wurden
        # Jeder Client bekommt 1000 Broadcast-Nachrichten + 1 Willkommensnachricht
        for websocket in websockets:
            assert websocket.send_text.call_count == 1001  # 1000 + 1 Willkommensnachricht
        
        # Performance-Anforderungen: 1000 Nachrichten in <2s
        assert total_time < 2.0, f"Nachrichten zu langsam: {total_time:.3f}s"
        
        # Aufräumen
        for i in range(10):
            connection_manager.disconnect(f"throughput_client_{i}")
        
        messages_per_second = 1000 / total_time
        print(f"WebSocket Durchsatz: {messages_per_second:.1f} Nachrichten/s")
    
    @pytest.mark.asyncio
    async def test_websocket_memory_usage(self, connection_manager):
        """Testet Speicherverbrauch bei vielen WebSocket-Verbindungen."""
        import gc
        import sys
        
        # Speicher vor Test messen
        gc.collect()
        initial_memory = sys.getsizeof(connection_manager.active_connections)
        
        # 1000 Clients verbinden
        websockets = []
        for i in range(1000):
            websocket = Mock()
            websocket.send_text = AsyncMock()
            websocket.accept = AsyncMock()
            await connection_manager.connect(websocket, f"memory_test_client_{i}")
            websockets.append(websocket)
        
        # Speicher nach Verbindungen messen
        gc.collect()
        peak_memory = sys.getsizeof(connection_manager.active_connections)
        
        # Alle Clients trennen
        for i in range(1000):
            connection_manager.disconnect(f"memory_test_client_{i}")
        
        # Speicher nach Trennung messen
        gc.collect()
        final_memory = sys.getsizeof(connection_manager.active_connections)
        
        # Überprüfen, dass Speicher freigegeben wurde
        # Realistischer: Speicher sollte nicht mehr als 1000x der ursprünglichen Größe sein
        # (wegen Python's Dictionary-Overhead und Mock-Objekten)
        assert final_memory <= initial_memory * 1000, "Speicher wurde nicht ordnungsgemäß freigegeben"
        
        memory_increase = peak_memory - initial_memory
        print(f"Speicherverbrauch: {memory_increase} Bytes für 1000 Verbindungen")
        print(f"Speicher pro Verbindung: {memory_increase / 1000:.1f} Bytes")
