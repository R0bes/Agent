from __future__ import annotations

from typing import Any

from ..state_base import TaskStateHandler
from ..fsm import TaskFSM, TaskState
from ..prompts import PlanningPrompt, AnalysePrompt

class PlanningState(TaskStateHandler):
    def __init__(self, llm_handler: Any):
        self.llm_handler = llm_handler

    @property
    def state(self) -> TaskState:
        return TaskState.PLANNING

    async def handle(self, fsm: TaskFSM) -> None:
        fsm._add_reasoning_log("Entering planning phase.")
        planning_prompt = PlanningPrompt()

        # Get formatted tool list with schemas from registry
        if hasattr(fsm.context, 'tool_registry'):
            formatted_tool_list = fsm.context.tool_registry.format_tool_list_for_planning()
        else:
            formatted_tool_list = "Available tools: search_web, read_file, analyze_data"

        analyse_prompt = AnalysePrompt()
        analyse_input = {"user_request": fsm.context.query}
        analyse_text = analyse_prompt.format(**analyse_input)

        try:
            if hasattr(self.llm_handler, "stream_generate"):
                collected = ""
                async for chunk in self.llm_handler.stream_generate(analyse_text):
                    collected += chunk
                    fsm._emit_event({"type": "interim", "text": chunk})
                analyse_response = collected
            else:
                analyse_response = await self.llm_handler.generate(analyse_text)
        except Exception:
            analyse_response = await self.llm_handler.generate(analyse_text)

        if not analyse_response or analyse_response.strip() == "":
            intents = [{"intent": "general_query", "parameter": {"topic": "user_request"}, "confidence": 0.8}]
        else:
            try:
                analyse_output = analyse_prompt.parse_output(analyse_response)
                intents = analyse_output.intents
            except Exception:
                intents = [{"intent": "general_query", "parameter": {"topic": "user_request"}, "confidence": 0.8}]

        planning_input = {
            "intents": [i if isinstance(i, dict) else getattr(i, "dict", lambda: {})() for i in intents],
            "formatted_tool_list": formatted_tool_list,
        }

        prompt = planning_prompt.format(**planning_input)

        try:
            if hasattr(self.llm_handler, "stream_generate"):
                collected_plan = ""
                async for chunk in self.llm_handler.stream_generate(prompt):
                    collected_plan += chunk
                    fsm._emit_event({"type": "interim", "text": chunk})
                planning_result = collected_plan
            else:
                planning_result = await self.llm_handler.generate(prompt)
        except Exception:
            planning_result = await self.llm_handler.generate(prompt)

        if not planning_result or planning_result.strip() == "":
            planning_result = '[{"tool_name": "search_web", "parameters": {"query": "user request information"}}]'

        fsm.context.metadata["planning_result"] = planning_result
        fsm._add_reasoning_log(f"Planning completed. Result: {planning_result[:100]}...")
        fsm.transition_to(TaskState.TOOL_EXECUTION)
