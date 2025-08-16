"""
Abstrakte Basisklasse für alle Agent-Implementierungen.
Definiert das Interface und gemeinsame Funktionalität.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AgentConfig(BaseModel):
    """Basis-Konfiguration für alle Agenten."""

    name: str
    model: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None
    timeout: int = 30


class AgentResponse(BaseModel):
    """Standard-Antwortformat für alle Agenten."""

    content: str
    model: str
    usage: Optional[Dict[str, Any]] = None
    finish_reason: Optional[str] = None
    timestamp: datetime = datetime.now()


class StreamChunk(BaseModel):
    """Repräsentiert einen einzelnen Stream-Chunk."""

    content: str
    done: bool
    model: str
    usage: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.now()


class BaseAgent(ABC):
    """
    Abstrakte Basisklasse für alle Agent-Implementierungen.

    Diese Klasse definiert das gemeinsame Interface und die grundlegende
    Funktionalität für alle Agenten im System.
    """

    def __init__(self, config: AgentConfig):
        """
        Initialisiert den Agenten mit der gegebenen Konfiguration.

        Args:
            config: Konfigurationsobjekt für den Agenten
        """
        self.config = config
        self.name = config.name
        self.model = config.model
        self.is_initialized = False
        self.logger = logging.getLogger(f"{__name__}.{self.name}")

    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialisiert den Agenten (z.B. Verbindung aufbauen).

        Returns:
            True wenn erfolgreich initialisiert, False sonst
        """
        pass

    @abstractmethod
    async def generate_response(
        self, prompt: str, context: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> AgentResponse:
        """
        Generiert eine Antwort basierend auf dem gegebenen Prompt.

        Args:
            prompt: Der Eingabe-Prompt für den Agenten
            context: Optionaler Kontext als Liste von Nachrichten
            **kwargs: Zusätzliche Parameter für die Generierung

        Returns:
            AgentResponse mit der generierten Antwort

        Raises:
            AgentError: Bei Fehlern während der Generierung
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Führt einen Gesundheitscheck des Agenten durch.

        Returns:
            Dictionary mit Gesundheitsstatus-Informationen
        """
        pass

    async def cleanup(self) -> None:
        """
        Bereinigt Ressourcen und schließt Verbindungen.
        Standard-Implementierung, kann überschrieben werden.
        """
        self.is_initialized = False
        self.logger.info(f"Agent {self.name} cleaned up")

    def get_config(self) -> AgentConfig:
        """
        Gibt die aktuelle Konfiguration des Agenten zurück.

        Returns:
            Aktuelle AgentConfig
        """
        return self.config

    def update_config(self, **kwargs) -> None:
        """
        Aktualisiert die Konfiguration des Agenten.

        Args:
            **kwargs: Zu aktualisierende Konfigurationswerte
        """
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                self.logger.info(f"Updated config {key} to {value}")

    def __str__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name}, model={self.model})"

    def __repr__(self) -> str:
        return self.__str__()


class AgentError(Exception):
    """Basis-Exception für alle Agent-bezogenen Fehler."""

    def __init__(self, message: str, agent_name: str = None, original_error: Exception = None):
        self.message = message
        self.agent_name = agent_name
        self.original_error = original_error
        super().__init__(self.message)

    def __str__(self):
        if self.agent_name:
            return f"AgentError in {self.agent_name}: {self.message}"
        return f"AgentError: {self.message}"
