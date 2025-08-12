from __future__ import annotations

from typing import Any, Dict

from ..state_base import TaskStateHandler
from ..fsm import TaskFSM, TaskState
from ..prompts import SynthesisPrompt

class ResultSynthesisState(TaskStateHandler):
    def __init__(self, llm_handler: Any):
        self.llm_handler = llm_handler

    @property
    def state(self) -> TaskState:
        return TaskState.RESULT_SYNTHESIS

    async def handle(self, fsm: TaskFSM) -> None:
        fsm._add_reasoning_log("Synthesizing final result.")
        synthesis_context: Dict[str, Any] = {
            "query": fsm.context.query,
            "tool_results": fsm.context.tool_results,
            "subtask_results": fsm.context.subtask_results,
            "reflections": fsm.context.reflections,
        }
        synthesis_prompt = SynthesisPrompt()
        prompt = synthesis_prompt.format(**synthesis_context)
        try:
            if hasattr(self.llm_handler, "stream_generate"):
                collected = ""
                async for chunk in self.llm_handler.stream_generate(prompt):
                    collected += chunk
                    fsm._emit_event({"type": "interim", "text": chunk})
                result = collected
            else:
                result = await self.llm_handler.generate(prompt)
            if not result or result.strip() == "":
                fsm.context.final_result = _fallback_synthesis(synthesis_context)
            else:
                fsm.context.final_result = result
        except Exception:
            fsm.context.final_result = _fallback_synthesis(synthesis_context)
        fsm.transition_to(TaskState.COMPLETED)


def _fallback_synthesis(ctx: Dict[str, Any]) -> str:
    query = ctx.get("query", "Unknown query")
    tool_results = ctx.get("tool_results", {})
    reflections = ctx.get("reflections", [])
    if tool_results:
        result_summary = " ".join([str(v)[:100] for v in tool_results.values()])
        return f"Based on the available information: {result_summary}. Original query: {query}"
    elif reflections:
        reflection_summary = " ".join(reflections)
        return f"Reflections: {reflection_summary}. Original query: {query}"
    else:
        return f"Unable to provide a complete answer for: {query}. Please try rephrasing your question."
