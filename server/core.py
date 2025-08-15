"""
Core-Komponenten für das Chat-Backend.
Enthält Datenmodelle und den Connection Manager.
"""

from fastapi import WebSocket
from pydantic import BaseModel
from datetime import datetime
import json
import logging
from typing import Dict, List

# Logging konfigurieren
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    """Pydantic Model für Chat-Nachrichten."""
    type: str
    content: str
    timestamp: datetime
    client_id: str


class ChatResponse(BaseModel):
    """Pydantic Model für Chat-Antworten."""
    type: str
    content: str
    timestamp: datetime


class ConnectionManager:
    """
    Manager für WebSocket-Verbindungen.
    
    Verwaltet aktive Verbindungen, Verbindungsaufbau/-abbau
    und das Senden von Nachrichten an Clients.
    """
    
    def __init__(self):
        """Initialisiert den Connection Manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_count = 0
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """
        Akzeptiert eine neue WebSocket-Verbindung.
        
        Args:
            websocket: WebSocket-Verbindung
            client_id: Eindeutige Client-ID
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_count += 1
        logger.info(f"Client {client_id} connected. Total connections: {self.connection_count}")
        
        # Willkommensnachricht senden
        welcome_message = {
            "type": "system",
            "content": f"Willkommen! Sie sind als {client_id} verbunden.",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_text(json.dumps(welcome_message))
    
    def disconnect(self, client_id: str):
        """
        Trennt eine WebSocket-Verbindung.
        
        Args:
            client_id: ID des zu trennenden Clients
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            self.connection_count -= 1
            logger.info(f"Client {client_id} disconnected. Total connections: {self.connection_count}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """
        Sendet eine persönliche Nachricht an einen spezifischen Client.
        
        Args:
            message: Zu sendende Nachricht
            client_id: ID des Ziel-Clients
        """
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: str):
        """
        Sendet eine Nachricht an alle verbundenen Clients.
        
        Args:
            message: Zu sendende Nachricht
        """
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Disconnected clients entfernen
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    def get_connection_count(self) -> int:
        """
        Gibt die Anzahl aktiver Verbindungen zurück.
        
        Returns:
            Anzahl aktiver Verbindungen
        """
        return self.connection_count
    
    def get_active_clients(self) -> List[str]:
        """
        Gibt eine Liste aller aktiven Client-IDs zurück.
        
        Returns:
            Liste der aktiven Client-IDs
        """
        return list(self.active_connections.keys())


# Globale Connection Manager Instanz
manager = ConnectionManager()
