"""
Konfiguration für das Chat-Backend.
"""

import os
from typing import Optional
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Konfigurationseinstellungen für das Chat-Backend."""
    
    # Server-Konfiguration
    host: str = Field(default="0.0.0.0", description="Server Host")
    port: int = Field(default=9797, description="Server Port")
    reload: bool = Field(default=True, description="Auto-Reload aktiviert")
    
    # Logging-Konfiguration
    log_level: str = Field(default="INFO", description="Log Level")
    log_format: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s", description="Log Format")
    
    # WebSocket-Konfiguration
    websocket_ping_interval: int = Field(default=20, description="WebSocket Ping Intervall")
    websocket_ping_timeout: int = Field(default=20, description="WebSocket Ping Timeout")
    
    # Sicherheit
    max_connections_per_client: int = Field(default=1, description="Max. Verbindungen pro Client")
    max_message_size: int = Field(default=1024 * 1024, description="Max. Nachrichtengröße (1MB)")
    
    # Agent-Integration
    enable_agents: bool = Field(default=True, description="Agent-Integration aktiviert")
    default_agent: str = Field(default="queen", description="Standard-Agent")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Globale Konfigurationsinstanz
settings = Settings()


def get_settings() -> Settings:
    """Gibt die aktuelle Konfiguration zurück."""
    return settings


def update_settings(**kwargs) -> None:
    """Aktualisiert die Konfiguration mit neuen Werten."""
    for key, value in kwargs.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
