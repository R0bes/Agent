"""
Einheitliches Bot Interface Template
Definiert eine gemeinsame Schnittstelle für alle Bot-Implementierungen
mit FastAPI-Integration für Docker-Netzwerk-Kommunikation
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Bot Status Enum
class BotStatus(Enum):
    """Status des Bots"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"
    MONITORING = "monitoring"

# Message Types
class MessageType(Enum):
    """Typ der Nachricht"""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    LOCATION = "location"

# Message Data Structure
@dataclass
class MessageData:
    """Datenstruktur für Nachrichten"""
    sender: str
    message: str
    timestamp: datetime
    message_type: MessageType = MessageType.TEXT
    chat_id: Optional[str] = None
    message_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary für JSON-Serialisierung"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['message_type'] = self.message_type.value
        return data

# Pydantic Models für FastAPI
class SendMessageRequest(BaseModel):
    """Request-Modell für das Senden von Nachrichten"""
    recipient: str  # Telefonnummer, Chat-ID oder Kontaktname
    message: str
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = None

class SendMessageResponse(BaseModel):
    """Response-Modell für das Senden von Nachrichten"""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: datetime

class BotStatusResponse(BaseModel):
    """Response-Modell für Bot-Status"""
    status: BotStatus
    is_healthy: bool
    last_activity: Optional[datetime] = None
    error_count: int = 0
    uptime: Optional[float] = None

class IncomingMessage(BaseModel):
    """Modell für eingehende Nachrichten"""
    sender: str
    message: str
    timestamp: datetime
    message_type: MessageType = MessageType.TEXT
    chat_id: Optional[str] = None
    message_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# Abstract Base Class für alle Bots
class BotInterface(ABC):
    """
    Abstrakte Basisklasse für alle Bot-Implementierungen
    Definiert die gemeinsame Schnittstelle
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.status = BotStatus.DISCONNECTED
        self.message_handler: Optional[Callable] = None
        self.running = False
        self.last_activity = None
        self.error_count = 0
        self.start_time = None
        self.fastapi_app: Optional[FastAPI] = None
        
        # Konfiguration
        self.max_retries = self.config.get('max_retries', 3)
        self.retry_delay = self.config.get('retry_delay', 5)
        self.monitoring_interval = self.config.get('monitoring_interval', 3)
        
        # Logging
        self.logger = logging.getLogger(self.__class__.__name__)
        
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialisiert den Bot"""
        pass
    
    @abstractmethod
    async def send_message(self, recipient: str, message: str, 
                          message_type: MessageType = MessageType.TEXT,
                          metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Sendet eine Nachricht"""
        pass
    
    @abstractmethod
    async def start_monitoring(self) -> bool:
        """Startet das Monitoring für eingehende Nachrichten"""
        pass
    
    @abstractmethod
    async def stop_monitoring(self):
        """Stoppt das Monitoring"""
        pass
    
    @abstractmethod
    async def close(self):
        """Schließt den Bot"""
        pass
    
    def set_message_handler(self, handler: Callable):
        """Setzt den Message Handler für eingehende Nachrichten"""
        self.message_handler = handler
    
    def get_status(self) -> BotStatusResponse:
        """Gibt den aktuellen Bot-Status zurück"""
        uptime = None
        if self.start_time:
            uptime = (datetime.now() - self.start_time).total_seconds()
            
        return BotStatusResponse(
            status=self.status,
            is_healthy=self.is_healthy(),
            last_activity=self.last_activity,
            error_count=self.error_count,
            uptime=uptime
        )
    
    def is_healthy(self) -> bool:
        """Überprüft ob der Bot gesund ist"""
        return (self.status in [BotStatus.CONNECTED, BotStatus.MONITORING] 
                and self.error_count < self.max_retries)
    
    def update_activity(self):
        """Aktualisiert den Zeitstempel der letzten Aktivität"""
        self.last_activity = datetime.now()
    
    async def process_incoming_message(self, message_data: MessageData):
        """Verarbeitet eingehende Nachrichten"""
        if self.message_handler:
            try:
                await self.message_handler(message_data)
                self.update_activity()
            except Exception as e:
                self.logger.error(f"Error processing incoming message: {e}")
                self.error_count += 1
        else:
            self.logger.warning("No message handler set")

# FastAPI Bot Wrapper
class FastAPIBotWrapper:
    """
    FastAPI Wrapper für Bot-Implementierungen
    Ermöglicht HTTP-API-Zugriff auf Bot-Funktionalitäten
    """
    
    def __init__(self, bot: BotInterface, host: str = "0.0.0.0", port: int = 8000):
        self.bot = bot
        self.host = host
        self.port = port
        self.app = FastAPI(
            title=f"{bot.__class__.__name__} API",
            description="FastAPI Interface für Bot-Operationen",
            version="1.0.0"
        )
        
        # CORS Middleware für Docker-Netzwerk
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        self._setup_routes()
    
    def _setup_routes(self):
        """Richtet die API-Routen ein"""
        
        @self.app.get("/")
        async def root():
            """Root-Endpunkt"""
            return {
                "message": f"{self.bot.__class__.__name__} API",
                "status": "running",
                "endpoints": [
                    "/status",
                    "/send",
                    "/health",
                    "/docs"
                ]
            }
        
        @self.app.get("/status", response_model=BotStatusResponse)
        async def get_status():
            """Gibt den Bot-Status zurück"""
            return self.bot.get_status()
        
        @self.app.get("/health")
        async def health_check():
            """Health Check für Docker"""
            status = self.bot.get_status()
            if status.is_healthy:
                return {"status": "healthy"}
            else:
                raise HTTPException(status_code=503, detail="Bot unhealthy")
        
        @self.app.post("/send", response_model=SendMessageResponse)
        async def send_message(request: SendMessageRequest):
            """Sendet eine Nachricht über den Bot"""
            try:
                success = await self.bot.send_message(
                    recipient=request.recipient,
                    message=request.message,
                    message_type=request.message_type,
                    metadata=request.metadata
                )
                
                if success:
                    return SendMessageResponse(
                        success=True,
                        timestamp=datetime.now()
                    )
                else:
                    raise HTTPException(status_code=500, detail="Failed to send message")
                    
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/webhook")
        async def webhook_endpoint(message: IncomingMessage):
            """Webhook-Endpunkt für eingehende Nachrichten"""
            try:
                # Konvertiere zu MessageData
                message_data = MessageData(
                    sender=message.sender,
                    message=message.message,
                    timestamp=message.timestamp,
                    message_type=message.message_type,
                    chat_id=message.chat_id,
                    message_id=message.message_id,
                    metadata=message.metadata
                )
                
                # Verarbeite die Nachricht
                await self.bot.process_incoming_message(message_data)
                
                return {"status": "processed"}
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/start")
        async def start_bot():
            """Startet den Bot"""
            try:
                if not self.bot.running:
                    success = await self.bot.start_monitoring()
                    if success:
                        return {"status": "started"}
                    else:
                        raise HTTPException(status_code=500, detail="Failed to start bot")
                else:
                    return {"status": "already running"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/stop")
        async def stop_bot():
            """Stoppt den Bot"""
            try:
                await self.bot.stop_monitoring()
                return {"status": "stopped"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
    
    async def start(self):
        """Startet den FastAPI-Server"""
        config = uvicorn.Config(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()
    
    def run_sync(self):
        """Startet den FastAPI-Server synchron"""
        uvicorn.run(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info"
        )

# Bot Factory
class BotFactory:
    """Factory für Bot-Instanzen"""
    
    @staticmethod
    def create_bot(bot_type: str, config: Optional[Dict[str, Any]] = None) -> BotInterface:
        """
        Erstellt eine Bot-Instanz basierend auf dem Typ
        
        Args:
            bot_type: Art des Bots ('whatsapp', 'telegram', etc.)
            config: Konfiguration für den Bot
            
        Returns:
            BotInterface: Bot-Instanz
        """
        if bot_type.lower() == "whatsapp":
            # Import hier um zirkuläre Imports zu vermeiden
            from adapter.whatsapp_bot.whatsapp_bot_interface import WhatsAppBotInterface
            return WhatsAppBotInterface(config=config)
        elif bot_type.lower() == "telegram":
            # Import hier um zirkuläre Imports zu vermeiden
            from adapter.telegram_bot.telegram_bot_interface import TelegramBotInterface
            return TelegramBotInterface(config=config)
        else:
            raise ValueError(f"Unbekannter Bot-Typ: {bot_type}")

# Beispiel für die Verwendung
async def main():
    """Beispiel für die Verwendung des Bot-Interfaces"""
    
    # Bot-Konfiguration
    config = {
        'headless': True,
        'max_retries': 3,
        'retry_delay': 5,
        'monitoring_interval': 3
    }
    
    # Bot erstellen
    bot = BotFactory.create_bot("whatsapp", config)
    
    # FastAPI Wrapper erstellen
    api_wrapper = FastAPIBotWrapper(bot, host="0.0.0.0", port=8000)
    
    try:
        # Bot initialisieren
        success = await bot.initialize()
        if not success:
            print("Failed to initialize bot")
            return
        
        # Message Handler setzen
        bot.set_message_handler(bot.process_incoming_message)
        
        # FastAPI-Server starten
        print(f"Starting FastAPI server on {api_wrapper.host}:{api_wrapper.port}")
        await api_wrapper.start()
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await bot.close()

if __name__ == "__main__":
    asyncio.run(main())
