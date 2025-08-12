import os
from typing import Dict, Any
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import FileReaderParameters, FileReaderResult

logger = get_logger(__name__)

class FileReader(BaseTool):
    """Real file reading tool that can read files from the filesystem."""
    
    def __init__(self):
        self.supported_extensions = ['.txt', '.md', '.py', '.json', '.yaml', '.yml', '.toml']
        super().__init__()
    
    def _get_description(self) -> str:
        return "Read text files from the filesystem. Supports .txt, .md, .py, .json, .yaml, .yml, .toml files."
    
    def _get_parameter_schema(self):
        return FileReaderParameters
    
    def _get_result_schema(self):
        return FileReaderResult
    
    async def execute(self, parameters: FileReaderParameters) -> FileReaderResult:
        """Execute the file reading tool."""
        filename = parameters.filename
        
        # Security check - prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            return FileReaderResult(
                success=False,
                message=f"Error: Invalid filename '{filename}' - directory traversal not allowed",
                data={"error": "directory_traversal_attempt"}
            )
        
        # Check if file exists
        if not os.path.exists(filename):
            return FileReaderResult(
                success=False,
                message=f"Error: File '{filename}' not found",
                data={"error": "file_not_found"}
            )
        
        # Check file extension
        _, ext = os.path.splitext(filename)
        if ext.lower() not in self.supported_extensions:
            return FileReaderResult(
                success=False,
                message=f"Error: File type '{ext}' not supported. Supported: {', '.join(self.supported_extensions)}",
                data={"error": "unsupported_file_type", "supported_types": self.supported_extensions}
            )
        
        try:
            # Read file content
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            file_size = len(content.encode('utf-8'))
            logger.info(f"Successfully read file: {filename}", file_size=file_size)
            
            return FileReaderResult(
                success=True,
                message=f"Successfully read file '{filename}'",
                content=content,
                file_size=file_size,
                encoding="utf-8"
            )
            
        except UnicodeDecodeError:
            return FileReaderResult(
                success=False,
                message=f"Error: File '{filename}' contains non-text content",
                data={"error": "unicode_decode_error"}
            )
        except Exception as e:
            logger.error(f"Error reading file {filename}", error=str(e))
            return FileReaderResult(
                success=False,
                message=f"Error reading file '{filename}': {str(e)}",
                data={"error": str(e)}
            )
