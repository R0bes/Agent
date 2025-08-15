"""
Chat Backend - Ein modulares Chat-Backend mit WebSocket-Unterstützung.
"""

from .core import ConnectionManager, ChatMessage, ChatResponse, manager
from .api import app, create_app

# Task Engine Exporte
try:
    from .tasks.base import BaseTask, TaskInput, TaskOutput, TaskPriority, TaskStatus
    from .tasks.engine import TaskEngine
    TASKS_AVAILABLE = True
except ImportError:
    TASKS_AVAILABLE = False

__version__ = "1.0.0"
__author__ = "Chat Backend Team"

__all__ = [
    "ConnectionManager",
    "ChatMessage", 
    "ChatResponse",
    "manager",
    "app",
    "create_app"
]

# Task Engine Exporte hinzufügen, falls verfügbar
if TASKS_AVAILABLE:
    __all__.extend([
        "BaseTask",
        "TaskInput", 
        "TaskOutput",
        "TaskPriority",
        "TaskStatus",
        "TaskEngine"
    ])
