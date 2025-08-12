# agent/task_engine/task.py
import asyncio
import uuid
from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

class TaskStatus(str, Enum):
    """Task Status States"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(int, Enum):
    """Task Priority Levels (lower number = higher priority in queue)"""
    CRITICAL = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3

@dataclass
class Task:
    """In-memory representation of a task"""
    id: uuid.UUID
    name: str
    executor_func: Any
    input_data: Dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.NORMAL
    retry_count: int = 0
    max_retries: int = 3

@dataclass
class TaskResult:
    """Task Execution Result"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0
