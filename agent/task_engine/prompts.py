from typing import Any, Dict, List
import json

class BasePrompt:
    def format(self, **kwargs) -> str:
        raise NotImplementedError

    def parse_output(self, output: str) -> Any:
        raise NotImplementedError

class AnalysePrompt(BasePrompt):
    def format(self, user_request: str) -> str:
        return f"""
        Analyze the following user request and extract distinct intents.
        For each intent, provide a short description, relevant parameters, and a confidence score (0.0-1.0).
        Return the output as a JSON object with a single key 'intents', which is a list of intent objects.
        Example: {{"intents": [{{"intent": "set_alarm", "parameter": {{"time": "07:00"}}, "confidence": 0.95}}]}}
        User Request: {user_request}
        """
    
    def parse_output(self, output: str) -> Any:
        # This is a simplified parser. In a real system, you'd use Pydantic models.
        try:
            data = json.loads(output)
            return type('AnalyseOutput', (object,), {'intents': data.get('intents', [])})()
        except json.JSONDecodeError:
            return type('AnalyseOutput', (object,), {'intents': []})()

class PlanningPrompt(BasePrompt):
    def format(self, intents: List[Dict[str, Any]], formatted_tool_list: str) -> str:
        return f"""
        Given the following user intents and available tools, create a detailed execution plan.
        The plan should be a JSON list of steps. Each step must include 'tool_name' and 'parameters'.
        If a tool is not available or information is missing, use "user_request" as tool_name.

        User Intents: {json.dumps(intents, indent=2)}

        Available Tools:
        {formatted_tool_list}

        Your Plan (JSON):
        """
    
    def parse_output(self, output: str) -> Any:
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            return [] # Return empty list if parsing fails

class SynthesisPrompt(BasePrompt):
    def format(self, query: str, tool_results: Dict[str, Any], subtask_results: Dict[str, Any], reflections: List[str]) -> str:
        return f"""
        Based on the original query, tool execution results, subtask outcomes, and reflections,
        synthesize a comprehensive final answer.

        Original Query: {query}
        Tool Results: {json.dumps(tool_results, indent=2)}
        Subtask Results: {json.dumps(subtask_results, indent=2)}
        Reflections: {json.dumps(reflections, indent=2)}

        Final Answer:
        """
    
    def parse_output(self, output: str) -> str:
        return output # For synthesis, the output is directly the string answer
