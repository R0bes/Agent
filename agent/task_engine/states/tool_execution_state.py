from __future__ import annotations

import json
from typing import Any

from ..state_base import TaskStateHandler
from ..fsm import TaskFSM, TaskState

class ToolExecutionState(TaskStateHandler):
    def __init__(self, tool_registry: Any):
        self.tool_registry = tool_registry

    @property
    def state(self) -> TaskState:
        return TaskState.TOOL_EXECUTION

    async def handle(self, fsm: TaskFSM) -> None:
        fsm._add_reasoning_log("Executing tools based on plan.")
        planning_result = fsm.context.metadata.get("planning_result")
        if not planning_result:
            fsm.transition_to(TaskState.REFLECTION)
            return

        try:
            plan_steps = json.loads(planning_result)
        except json.JSONDecodeError:
            tool = self.tool_registry.get_tool("search_web")
            if tool:
                try:
                    tool_output = await tool({"query": fsm.context.query})
                    fsm.context.tool_results["search_web"] = tool_output
                    fsm._add_reasoning_log(f"Fallback tool executed. Output: {str(tool_output)[:100]}...")
                except Exception as e:
                    fsm._add_reasoning_log(f"Error executing fallback tool: {e}")
            fsm.transition_to(TaskState.REFLECTION)
            return

        for step in plan_steps:
            tool_name = step.get("tool_name")
            parameters = step.get("parameters", {})

            if tool_name == "user_request":
                fsm._add_reasoning_log(f"User request step: {step.get('notes', 'No notes')}")
                continue

            tool = self.tool_registry.get_tool(tool_name)
            if tool:
                try:
                    tool_output = await tool(parameters)
                    fsm.context.tool_results[tool_name] = tool_output
                    fsm._add_reasoning_log(f"Tool '{tool_name}' executed. Output: {str(tool_output)[:100]}...")
                except Exception as e:
                    fsm._add_reasoning_log(f"Error executing tool '{tool_name}': {e}")
                    fsm.context.error_info = f"Tool execution error: {e}"
                    fsm.transition_to(TaskState.REFLECTION)
                    return
            else:
                fsm._add_reasoning_log(f"Tool '{tool_name}' not found.")
                fsm.context.error_info = f"Tool '{tool_name}' not found."
                fsm.transition_to(TaskState.REFLECTION)
                return

        fsm.transition_to(TaskState.REFLECTION)
