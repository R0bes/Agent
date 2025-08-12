from __future__ import annotations

from ..state_base import TaskStateHandler
from ..fsm import TaskFSM, TaskState

class InitState(TaskStateHandler):
    @property
    def state(self) -> TaskState:
        return TaskState.INIT

    async def handle(self, fsm: TaskFSM) -> None:
        fsm._add_reasoning_log("Initializing reasoning task.")
        fsm.transition_to(TaskState.PLANNING)
