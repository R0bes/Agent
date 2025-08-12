from __future__ import annotations

from ..state_base import TaskStateHandler
from ..fsm import TaskFSM, TaskState

class ReflectionState(TaskStateHandler):
    @property
    def state(self) -> TaskState:
        return TaskState.REFLECTION

    async def handle(self, fsm: TaskFSM) -> None:
        fsm._add_reasoning_log("Entering reflection phase.")
        if fsm.context.error_info:
            fsm.context.reflections.append(
                f"Encountered error: {fsm.context.error_info}. Need to re-plan or fail."
            )
            if fsm.context.iteration_count > 3:
                fsm.transition_to(TaskState.RESULT_SYNTHESIS, "Too many iterations, proceeding to synthesis.")
            else:
                fsm.transition_to(TaskState.PLANNING)
        elif not fsm.context.tool_results and not fsm.context.subtask_results:
            fsm.context.reflections.append("No results yet. Re-planning.")
            if fsm.context.iteration_count > 3:
                fsm.transition_to(TaskState.RESULT_SYNTHESIS, "Too many iterations, proceeding to synthesis.")
            else:
                fsm.transition_to(TaskState.PLANNING)
        else:
            fsm.context.reflections.append("Tools executed successfully. Ready for synthesis.")
            fsm.transition_to(TaskState.RESULT_SYNTHESIS)
