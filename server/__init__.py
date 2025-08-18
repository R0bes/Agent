"""
Chat Backend - Ein modulares Chat-Backend mit WebSocket-Unterstützung.
"""

from .core import ConnectionManager, ChatMessage, ChatResponse, manager
from .api import app, create_app

# Task Engine Exporte
TASKS_AVAILABLE = False

__version__ = "1.0.0"
__author__ = "Chat Backend Team"

__all__ = [
    "ConnectionManager",
    "ChatMessage",
    "ChatResponse",
    "manager",
    "app",
    "create_app",
]
