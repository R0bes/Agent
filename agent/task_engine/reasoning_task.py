from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional, Dict

from .fsm import TaskFSM, TaskInput, TaskState, StateContext
from .states import (
    InitState,
    PlanningState,
    ToolExecutionState,
    ReflectionState,
    ResultSynthesisState,
)


@dataclass
class ReasoningTaskInput:
    """Input for reasoning tasks"""
    query: str
    agent_id: Any
    llm_handler: Any
    tool_registry: Any
    parent_task_id: Optional[Any] = None
    allow_subtasks: bool = False
    max_subtask_depth: int = 3
    max_iterations: int = 5
    on_state_change: Optional[Callable[[TaskState, TaskState, StateContext], None]] = None
    on_yield: Optional[Callable[[TaskState, StateContext], None]] = None
    on_event: Optional[Callable[[Dict[str, Any]], None]] = None


class ReasoningTask:
    """FSM-gestützte Reasoning-Task mit registrierten State-Handlern."""

    def __init__(self, task_input: ReasoningTaskInput):
        self.input = task_input
        self.fsm = TaskFSM(
            TaskInput(
                query=task_input.query,
                agent_id=task_input.agent_id,
                parent_task_id=task_input.parent_task_id,
                allow_subtasks=task_input.allow_subtasks,
                max_subtask_depth=task_input.max_subtask_depth,
                max_iterations=task_input.max_iterations,
                on_state_change=task_input.on_state_change,
                on_yield=task_input.on_yield,
                on_event=task_input.on_event,
            )
        )
        
        # Set tool registry in context for planning
        self.fsm.context.tool_registry = task_input.tool_registry

        # Register state handlers
        self.init_state = InitState()
        self.planning_state = PlanningState(task_input.llm_handler)
        self.exec_state = ToolExecutionState(task_input.tool_registry)
        self.reflect_state = ReflectionState()
        self.synth_state = ResultSynthesisState(task_input.llm_handler)

        self.fsm.register_state(TaskState.INIT, self.init_state.handle)
        self.fsm.register_state(TaskState.PLANNING, self.planning_state.handle)
        self.fsm.register_state(TaskState.TOOL_EXECUTION, self.exec_state.handle)
        self.fsm.register_state(TaskState.REFLECTION, self.reflect_state.handle)
        self.fsm.register_state(TaskState.RESULT_SYNTHESIS, self.synth_state.handle)

    @property
    def id(self) -> str:
        return self.fsm.id

    async def run(self) -> str:
        return await self.fsm.run()


