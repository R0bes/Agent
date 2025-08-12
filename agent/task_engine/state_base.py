from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol

from .fsm import TaskState, TaskFSM


class TaskStateHandler(ABC):
    """Interface für zustandsbasierte Handler in der FSM."""

    @property
    @abstractmethod
    def state(self) -> TaskState:  # pragma: no cover - einfache Property
        ...

    @abstractmethod
    async def handle(self, fsm: TaskFSM) -> None:
        ...


