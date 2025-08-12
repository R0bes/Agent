from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type
from pydantic import BaseModel, Field
from agent.utils.log import get_logger

logger = get_logger(__name__)

class ToolParameters(BaseModel):
    """Base class for tool parameter schemas."""
    pass

class ToolResult(BaseModel):
    """Base class for tool result schemas."""
    success: bool = Field(description="Whether the tool execution was successful")
    message: str = Field(description="Human-readable message about the execution")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Tool-specific result data")

class BaseTool(ABC):
    """Abstract base class for all tools."""
    
    def __init__(self):
        self.name: str = self.__class__.__name__.lower()
        self.description: str = self._get_description()
        self.parameter_schema: Type[ToolParameters] = self._get_parameter_schema()
        self.result_schema: Type[ToolResult] = self._get_result_schema()
    
    @abstractmethod
    def _get_description(self) -> str:
        """Return a human-readable description of what this tool does."""
        pass
    
    @abstractmethod
    def _get_parameter_schema(self) -> Type[ToolParameters]:
        """Return the Pydantic model for tool parameters."""
        pass
    
    @abstractmethod
    def _get_result_schema(self) -> Type[ToolResult]:
        """Return the Pydantic model for tool results."""
        pass
    
    @abstractmethod
    async def execute(self, parameters: ToolParameters) -> ToolResult:
        """Execute the tool with the given parameters."""
        pass
    
    def get_schema_info(self) -> Dict[str, Any]:
        """Get schema information for planning prompts."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameter_schema.model_json_schema(),
            "result": self.result_schema.model_json_schema()
        }
    
    async def __call__(self, parameters: Dict[str, Any]) -> str:
        """Compatibility method for existing tool registry."""
        try:
            # Validate parameters against schema
            validated_params = self.parameter_schema(**parameters)
            
            # Execute tool
            result = await self.execute(validated_params)
            
            # Return as string for compatibility
            return result.model_dump_json(indent=2)
            
        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            error_result = self.result_schema(
                success=False,
                message=f"Tool execution failed: {str(e)}",
                data={"error": str(e)}
            )
            return error_result.model_dump_json(indent=2)
