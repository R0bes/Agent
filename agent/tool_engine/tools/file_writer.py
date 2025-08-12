import os
from typing import Dict, Any
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import FileWriterParameters, FileWriterResult

logger = get_logger(__name__)

class FileWriter(BaseTool):
    """Real file writing tool that can write files to the filesystem."""
    
    def __init__(self):
        self.supported_extensions = ['.txt', '.md', '.py', '.json', '.yaml', '.yml']
        self.max_file_size = 1024 * 1024  # 1MB limit
        super().__init__()
    
    def _get_description(self) -> str:
        return "Write text files to the filesystem. Supports .txt, .md, .py, .json, .yaml, .yml files. Max file size: 1MB."
    
    def _get_parameter_schema(self):
        return FileWriterParameters
    
    def _get_result_schema(self):
        return FileWriterResult
    
    async def execute(self, parameters: FileWriterParameters) -> FileWriterResult:
        """Execute the file writing tool."""
        filename = parameters.filename
        content = parameters.content
        
        # Security check - prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            return FileWriterResult(
                success=False,
                message=f"Error: Invalid filename '{filename}' - directory traversal not allowed",
                data={"error": "directory_traversal_attempt"}
            )
        
        # Check content size
        if len(content) > self.max_file_size:
            return FileWriterResult(
                success=False,
                message=f"Error: Content too large ({len(content)} bytes). Max size: {self.max_file_size} bytes",
                data={"error": "content_too_large", "content_size": len(content), "max_size": self.max_file_size}
            )
        
        # Check file extension
        _, ext = os.path.splitext(filename)
        if ext.lower() not in self.supported_extensions:
            return FileWriterResult(
                success=False,
                message=f"Error: File type '{ext}' not supported. Supported: {', '.join(self.supported_extensions)}",
                data={"error": "unsupported_file_type", "supported_types": self.supported_extensions}
            )
        
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # Write file content
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            
            bytes_written = len(content.encode('utf-8'))
            logger.info(f"Successfully wrote file: {filename}", file_size=bytes_written)
            
            return FileWriterResult(
                success=True,
                message=f"Successfully wrote {bytes_written} bytes to '{filename}'",
                bytes_written=bytes_written,
                file_path=filename
            )
            
        except Exception as e:
            logger.error(f"Error writing file {filename}", error=str(e))
            return FileWriterResult(
                success=False,
                message=f"Error writing file '{filename}': {str(e)}",
                data={"error": str(e)}
            )
