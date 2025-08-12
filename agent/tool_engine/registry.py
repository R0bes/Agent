from typing import Any, Dict, Callable, Optional, List
from agent.utils.log import get_logger
from .tools import FileReader, FileWriter, WebSearch, DataAnalyzer, CodeExecutor, SystemInfo, LogAccess

logger = get_logger(__name__)

class ToolRegistry:
    """Registry for managing and executing tools."""
    
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self._register_real_tools()
    
    def register_tool(self, name: str, tool_func: Callable) -> None:
        """Register a new tool function."""
        self.tools[name] = tool_func
        logger.info(f"Registered tool: {name}")
    
    def get_tool(self, name: str) -> Optional[Callable]:
        """Get a tool by name."""
        return self.tools.get(name)
    
    def list_tools(self) -> list[str]:
        """List all available tool names."""
        return list(self.tools.keys())
    
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Get schema information for all tools for planning prompts."""
        schemas = []
        for tool_name, tool in self.tools.items():
            if hasattr(tool, 'get_schema_info'):
                schema_info = tool.get_schema_info()
                schema_info['name'] = tool_name  # Ensure correct name
                schemas.append(schema_info)
        return schemas
    
    def format_tool_list_for_planning(self) -> str:
        """Format tool information for planning prompts."""
        schemas = self.get_tool_schemas()
        if not schemas:
            return "No tools available"
        
        formatted = []
        for schema in schemas:
            tool_info = f"Tool: {schema['name']}\n"
            tool_info += f"Description: {schema['description']}\n"
            tool_info += f"Parameters: {schema['parameters']}\n"
            tool_info += f"Returns: {schema['result']}\n"
            formatted.append(tool_info)
        
        return "\n".join(formatted)
    
    def _register_real_tools(self):
        """Register real tools."""
        # File operations
        self.register_tool("read_file", FileReader())
        self.register_tool("write_file", FileWriter())
        
        # Web search
        self.register_tool("web_search", WebSearch())
        self.register_tool("search_web", WebSearch())  # Alias for compatibility
        
        # Data analysis
        self.register_tool("analyze_data", DataAnalyzer())
        
        # Code execution
        self.register_tool("execute_code", CodeExecutor())
        
        # System information
        self.register_tool("system_info", SystemInfo())
        
        # Log access
        self.register_tool("log_access", LogAccess())
