# agent/prompts/prompt_template.py
from .lci import LCI
from typing import Type, TypeVar, Generic, List, Tuple, get_args, get_origin
import json

# ==============================================================================
#                               BasePromptTemplate
# ==============================================================================

class IPrompt(LCI): pass
class OPrompt(LCI): pass

I = TypeVar("I", bound=IPrompt)
O = TypeVar("O", bound=OPrompt)

class PromptTemplateMeta(type):
    def __new__(mcls, name, bases, ns, **kwargs):
        cls = super().__new__(mcls, name, bases, ns)
        for base in getattr(cls, "__orig_bases__", []):
            if getattr(get_origin(base), "__name__", None) == "BasePromptTemplate":
                cls.input_model, cls.output_model = get_args(base)
        return cls

JSON_MD = lambda j: f"```json\n{j}\n```"

class PromptTemplate(Generic[I, O], metaclass=PromptTemplateMeta):
    """
    Abstrakte Basisklasse für einen LLM-Prompt.
    """
    input_model: Type[I]
    output_model: Type[O]

    title: str
    instructions: str

    examples: List[Tuple[I,O]] = []

    @classmethod
    def render_prompt(cls, input: I) -> str:
        formatted_input = JSON_MD(input.model_dump_json(indent=2))

        if cls.examples:
            examples = ["## Examples:"]
            no = 0
            for i, e in enumerate(cls.examples):
                examples.append(f"### Example {i+1}")
                examples.extend([f"**Input:**", JSON_MD(e[0].model_dump_json(indent=2))])
                examples.extend([f"**Output:**", JSON_MD(e[1].model_dump_json(indent=2))])
        #else: # no examples - provice schema as fallback
        #    examples = [
        #        f"**Input Schema:**", JSON_MD(cls.input_model.schema()),
        #        f"**Output Schema:**", JSON_MD(cls.output_model.schema()),
        #    ]

        return \
f"""# Task '{cls.title}'
{cls.instructions}

## Examples
{examples}

Answer **only** in the given JSON-format!

## Current Input
{formatted_input}
"""
    
    @classmethod
    def parse_output(cls, llm_response: str) -> O:
        return cls.output_model.from_string(llm_response)
