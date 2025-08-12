from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from .base import ToolParameters, ToolResult

# File Reader Schemas
class FileReaderParameters(ToolParameters):
    filename: str = Field(description="Path to the file to read")
    
class FileReaderResult(ToolResult):
    content: Optional[str] = Field(default=None, description="File content")
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    encoding: Optional[str] = Field(default=None, description="File encoding")

# File Writer Schemas
class FileWriterParameters(ToolParameters):
    filename: str = Field(description="Path to the file to write")
    content: str = Field(description="Content to write to the file")
    
class FileWriterResult(ToolResult):
    bytes_written: Optional[int] = Field(default=None, description="Number of bytes written")
    file_path: Optional[str] = Field(default=None, description="Path of the written file")

# Web Search Schemas
class WebSearchParameters(ToolParameters):
    query: str = Field(description="Search query to execute")
    max_results: Optional[int] = Field(default=3, description="Maximum number of results to return")
    
class WebSearchResult(ToolResult):
    results: Optional[List[Dict[str, Any]]] = Field(default=None, description="Search results")
    query: Optional[str] = Field(default=None, description="Original search query")
    result_count: Optional[int] = Field(default=None, description="Number of results found")

# Data Analysis Schemas
class DataAnalyzerParameters(ToolParameters):
    data: str = Field(description="Data to analyze")
    analysis_type: Optional[str] = Field(
        default="comprehensive", 
        description="Type of analysis: word_count, character_count, line_count, json_parse, frequency_analysis, comprehensive"
    )
    
class DataAnalyzerResult(ToolResult):
    analysis: Optional[Dict[str, Any]] = Field(default=None, description="Analysis results")
    analysis_type: Optional[str] = Field(default=None, description="Type of analysis performed")
    data_length: Optional[int] = Field(default=None, description="Length of analyzed data")

# Code Execution Schemas
class CodeExecutionParameters(ToolParameters):
    code: str = Field(description="Python code to execute")
    timeout: Optional[int] = Field(default=30, description="Execution timeout in seconds")
    
class CodeExecutionResult(ToolResult):
    output: Optional[str] = Field(default=None, description="Code execution output")
    error: Optional[str] = Field(default=None, description="Execution error if any")
    execution_time: Optional[float] = Field(default=None, description="Execution time in seconds")

# System Info Schemas
class SystemInfoParameters(ToolParameters):
    info_type: Optional[str] = Field(
        default="all", 
        description="Type of system info: all, cpu, memory, disk, datetime, process"
    )
    
class SystemInfoResult(ToolResult):
    system_info: Optional[Dict[str, Any]] = Field(default=None, description="System information")
    info_type: Optional[str] = Field(default=None, description="Type of info requested")

# Log Access Schemas
class LogAccessParameters(ToolParameters):
    log_file: Optional[str] = Field(default=None, description="Specific log file to read")
    level: Optional[str] = Field(default="INFO", description="Log level filter: DEBUG, INFO, WARNING, ERROR")
    lines: Optional[int] = Field(default=100, description="Number of lines to retrieve")
    
class LogAccessResult(ToolResult):
    log_entries: Optional[List[Dict[str, Any]]] = Field(default=None, description="Log entries")
    total_entries: Optional[int] = Field(default=None, description="Total number of entries found")
    log_file: Optional[str] = Field(default=None, description="Log file accessed")
