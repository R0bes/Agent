"""
Basisklassen für die Task Engine.
Definiert Task Input, Output und abstrakte Task-Implementierungen.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime
from enum import Enum
import uuid


class TaskPriority(Enum):
    """Prioritätsstufen für Tasks."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


class TaskStatus(Enum):
    """Status-Stufen für Tasks."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskInput:
    """Basisklasse für Task-Eingabedaten."""
    
    def __init__(self, data: Dict[str, Any] = None, metadata: Dict[str, Any] = None):
        """
        Initialisiert Task-Input.
        
        Args:
            data: Hauptdaten für den Task
            metadata: Zusätzliche Metadaten
        """
        self.data = data or {}
        self.metadata = metadata or {}
        self.timestamp = datetime.now()
        self.input_id = str(uuid.uuid4())
    
    def get(self, key: str, default: Any = None) -> Any:
        """Holt einen Wert aus den Daten."""
        return self.data.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Setzt einen Wert in den Daten."""
        self.data[key] = value
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert den Input zu einem Dictionary."""
        return {
            "input_id": self.input_id,
            "data": self.data,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }
    
    def __str__(self) -> str:
        return f"TaskInput(id={self.input_id}, data_keys={list(self.data.keys())})"


class TaskOutput:
    """Basisklasse für Task-Ausgabedaten."""
    
    def __init__(self, result: Any = None, success: bool = True, error: Optional[str] = None):
        """
        Initialisiert Task-Output.
        
        Args:
            result: Ergebnis des Tasks
            success: Erfolgsstatus
            error: Fehlermeldung (falls vorhanden)
        """
        self.result = result
        self.success = success
        self.error = error
        self.timestamp = datetime.now()
        self.output_id = str(uuid.uuid4())
    
    def is_success(self) -> bool:
        """Prüft, ob der Task erfolgreich war."""
        return self.success
    
    def get_result(self) -> Any:
        """Gibt das Ergebnis zurück."""
        return self.result
    
    def get_error(self) -> Optional[str]:
        """Gibt die Fehlermeldung zurück."""
        return self.error
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert den Output zu einem Dictionary."""
        return {
            "output_id": self.output_id,
            "result": self.result,
            "success": self.success,
            "error": self.error,
            "timestamp": self.timestamp.isoformat()
        }
    
    def __str__(self) -> str:
        status = "SUCCESS" if self.success else "FAILED"
        return f"TaskOutput(id={self.output_id}, status={status})"


class BaseTask(ABC):
    """
    Abstrakte Basisklasse für alle Tasks.
    
    Jeder Task muss die execute-Methode implementieren.
    """
    
    def __init__(self, task_id: Optional[str] = None, priority: TaskPriority = TaskPriority.NORMAL, name: Optional[str] = None, description: Optional[str] = None):
        """
        Initialisiert einen neuen Task.
        
        Args:
            task_id: Eindeutige Task-ID (wird automatisch generiert, falls nicht angegeben)
            priority: Priorität des Tasks
            name: Name des Tasks
            description: Beschreibung des Tasks
        """
        self.task_id = task_id or str(uuid.uuid4())
        self.priority = priority
        self.name = name or f"Task_{self.task_id[:8]}"
        self.description = description or "Ein Task ohne Beschreibung"
        self.status = TaskStatus.PENDING
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.input: Optional[TaskInput] = None
        self.output: Optional[TaskOutput] = None
        self.error: Optional[str] = None
        self.retry_count = 0
        self.max_retries = 3
    
    @abstractmethod
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """
        Führt den Task aus.
        
        Args:
            task_input: Eingabedaten für den Task
            
        Returns:
            TaskOutput mit dem Ergebnis
        """
        pass
    
    def set_input(self, task_input: TaskInput) -> None:
        """Setzt den Task-Input."""
        self.input = task_input
    
    def set_output(self, task_output: TaskOutput) -> None:
        """Setzt den Task-Output."""
        self.output = task_output
        self.completed_at = datetime.now()
    
    def set_error(self, error: str) -> None:
        """Setzt eine Fehlermeldung."""
        self.error = error
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.now()
    
    def start(self) -> None:
        """Markiert den Task als gestartet."""
        self.status = TaskStatus.RUNNING
        self.started_at = datetime.now()
    
    def complete(self) -> None:
        """Markiert den Task als abgeschlossen."""
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now()
    
    def cancel(self) -> None:
        """Bricht den Task ab."""
        self.status = TaskStatus.CANCELLED
        self.completed_at = datetime.now()
    
    def can_retry(self) -> bool:
        """Prüft, ob der Task wiederholt werden kann."""
        return self.retry_count < self.max_retries and self.status == TaskStatus.FAILED
    
    def increment_retry(self) -> None:
        """Erhöht den Wiederholungszähler."""
        self.retry_count += 1
        self.status = TaskStatus.PENDING
    
    def get_execution_time(self) -> Optional[float]:
        """Gibt die Ausführungszeit in Sekunden zurück."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert den Task zu einem Dictionary."""
        return {
            "task_id": self.task_id,
            "priority": self.priority.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "error": self.error,
            "execution_time": self.get_execution_time()
        }
    
    def __str__(self) -> str:
        return f"Task(id={self.task_id}, priority={self.priority.name}, status={self.status.value})"
    
    def __lt__(self, other: 'BaseTask') -> bool:
        """Vergleicht Tasks basierend auf Priorität (höhere Priorität = niedrigerer Wert)."""
        if self.priority.value != other.priority.value:
            return self.priority.value > other.priority.value
        # Bei gleicher Priorität: ältere Tasks zuerst
        return self.created_at < other.created_at
