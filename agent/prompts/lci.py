# agent/prompts/lci.py
from abc import ABC
from copy import deepcopy
from pydantic import BaseModel
import json

# ==============================================================================
#                       LCI (LLM Communication Interface)
# ==============================================================================
class LCI(ABC, BaseModel): # LLM communication interface

    def as_string(self): return self.model_dump_json(indent=2)
    
    @classmethod
    def from_string(cls, data_string: str) -> "LCI": 
        if data_string.strip().startswith("```json"):
            data_string = data_string.strip()[7:-3].strip()
        return cls.model_validate_json(data_string)
    
    @classmethod
    def schema(cls, resolve: bool = True):
        schema = cls.model_json_schema()
        if resolve:
            defs = schema.get("$defs", {})
            def _resolve(obj):
                if isinstance(obj, dict):
                    obj = {k: v for k, v in obj.items() if k != "title"}
                    if "$ref" in obj:
                        return _resolve({
                            **deepcopy(defs.get(obj["$ref"].split("/")[-1], {})), 
                            **{k: _resolve(v) for k, v in obj.items() if k != "$ref"}})
                    return {k: _resolve(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [_resolve(x) for x in obj]
                return obj
            resolved_schema = _resolve({k: v for k, v in schema.items() if k != "$defs"})
            schema = resolved_schema.get("properties", resolved_schema)
        return json.dumps(schema, indent=2)
