"""
Task Engine Module.
Enthält alle Komponenten für die Task-Verarbeitung und das globale Event-Handling.
"""

from .base import (
    BaseTask,
    TaskInput,
    TaskOutput,
    TaskStatus,
    TaskPriority
)

from .engine import (
    TaskEngine,
    GlobalEventManager,
    MessageEvent
)

from .message_tasks import (
    ChatMessageTask,
    PingMessageTask,
    StatusMessageTask,
    MessageTaskFactory
)

from .console_worker import ConsoleWorker

__all__ = [
    # Base classes
    "BaseTask",
    "TaskInput", 
    "TaskOutput",
    "TaskStatus",
    "TaskPriority",
    
    # Engine
    "TaskEngine",
    "GlobalEventManager",
    "MessageEvent",
    
    # Message tasks
    "ChatMessageTask",
    "PingMessageTask", 
    "StatusMessageTask",
    "MessageTaskFactory",
    
    # Console worker
    "ConsoleWorker"
]
