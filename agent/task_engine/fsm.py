from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

from agent.utils.log import get_logger

logger = get_logger(__name__)


class TaskState(str, Enum):
    INIT = "init"
    PLANNING = "planning"
    TOOL_EXECUTION = "tool_execution"
    REFLECTION = "reflection"
    SUBTASK_SPAWNING = "subtask_spawning"
    WAITING_SUBTASKS = "waiting_subtasks"
    RESULT_SYNTHESIS = "result_synthesis"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class StateContext:
    query: str
    agent_id: Any
    parent_task_id: Optional[Any] = None
    current_state: TaskState = TaskState.INIT
    tool_results: Dict[str, Any] = field(default_factory=dict)
    subtask_results: Dict[str, Any] = field(default_factory=dict)
    reflections: List[str] = field(default_factory=list)
    final_result: Optional[str] = None
    error_info: Optional[str] = None
    iteration_count: int = 0
    max_iterations: int = 10
    metadata: Dict[str, Any] = field(default_factory=dict)
    tool_registry: Optional[Any] = None  # Tool registry for planning


@dataclass
class TaskInput:
    query: str
    agent_id: Any
    parent_task_id: Optional[Any] = None
    allow_subtasks: bool = False
    max_subtask_depth: int = 3
    max_iterations: int = 10
    on_state_change: Optional[Callable[[TaskState, TaskState, StateContext], None]] = None
    on_yield: Optional[Callable[[TaskState, StateContext], None]] = None
    on_event: Optional[Callable[[Dict[str, Any]], None]] = None


@dataclass
class StateTransition:
    from_state: TaskState
    to_state: TaskState
    context: StateContext
    yield_control: bool = False


class TaskFSM:
    """Leichtgewichtige FSM mit State-Registry."""

    def __init__(self, task_input: TaskInput):
        self.input = task_input
        self.id = str(uuid.uuid4())
        self.context = StateContext(
            query=task_input.query,
            agent_id=task_input.agent_id,
            parent_task_id=task_input.parent_task_id,
            max_iterations=task_input.max_iterations,
        )
        self._handlers: Dict[TaskState, Callable[[TaskFSM], Any]] = {}
        self._ordered_states: List[TaskState] = []

    def register_state(self, state: TaskState, handler: Callable[["TaskFSM"], Any]) -> None:
        self._handlers[state] = handler
        if state not in self._ordered_states:
            self._ordered_states.append(state)

    def transition_to(self, new_state: TaskState, message: Optional[str] = None) -> None:
        old_state = self.context.current_state
        self.context.current_state = new_state
        if self.input.on_state_change:
            self.input.on_state_change(old_state, new_state, self.context)
        self._add_reasoning_log(f"Transitioned from {old_state.value} to {new_state.value}. {message or ''}")
        self._emit_event({"type": "state", "from": old_state.value, "to": new_state.value, "message": message})

    async def run(self) -> Any:
        logger.info("FSM start", task_id=self.id)
        self._emit_event({"type": "task_start", "task_id": self.id, "query": self.context.query})
        async for _ in self._loop():
            pass
        logger.info("FSM end", task_id=self.id, result_len=len(self.context.final_result or ""))
        self._emit_event({"type": "task_end", "task_id": self.id, "result": self.context.final_result})
        return self.context.final_result

    async def _loop(self) -> AsyncGenerator[StateTransition, None]:
        while self.context.current_state not in {TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED}:
            if self.context.iteration_count >= self.context.max_iterations:
                self.transition_to(TaskState.FAILED, "Max iterations reached")
                break
            from_state = self.context.current_state
            handler = self._handlers.get(from_state)
            if handler is None:
                self.context.error_info = f"No handler registered for state {from_state}"
                self.transition_to(TaskState.FAILED)
                break
            try:
                await handler(self)
            except Exception as e:
                logger.error("FSM state error", state=from_state, error=str(e))
                self.context.error_info = str(e)
                self.transition_to(TaskState.FAILED, f"Error in state {from_state}: {e}")
                break

            yield StateTransition(from_state=from_state, to_state=self.context.current_state, context=self.context, yield_control=True)
            self.context.iteration_count += 1

        yield StateTransition(from_state=self.context.current_state, to_state=self.context.current_state, context=self.context, yield_control=False)

    def _add_reasoning_log(self, message: str) -> None:
        if "reasoning_log" not in self.context.metadata:
            self.context.metadata["reasoning_log"] = []
        self.context.metadata["reasoning_log"].append({
            "timestamp": asyncio.get_event_loop().time(),
            "state": self.context.current_state.value,
            "iteration": self.context.iteration_count,
            "message": message,
        })
        self._emit_event({"type": "reasoning", "message": message})

    def _emit_event(self, event: Dict[str, Any]) -> None:
        cb = getattr(self.input, "on_event", None)
        if callable(cb):
            try:
                cb(event)
            except Exception:
                pass


