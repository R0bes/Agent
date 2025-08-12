import os
import re
import glob
from datetime import datetime
from typing import Dict, Any, List
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import LogAccessParameters, LogAccessResult

logger = get_logger(__name__)

class LogAccess(BaseTool):
    """Log file access and filtering tool."""
    
    def __init__(self):
        self.log_directory = "logs"
        self.default_log_files = ["app.log", "error.log"]
        super().__init__()
    
    def _get_description(self) -> str:
        return "Access and filter log files. Supports level filtering and line limits."
    
    def _get_parameter_schema(self):
        return LogAccessParameters
    
    def _get_result_schema(self):
        return LogAccessResult
    
    def _get_log_files(self) -> List[str]:
        """Get available log files."""
        log_files = []
        
        # Check if logs directory exists
        if os.path.exists(self.log_directory):
            # Get all .log files in logs directory
            log_files.extend(glob.glob(os.path.join(self.log_directory, "*.log")))
        
        # Also check for log files in current directory
        log_files.extend(glob.glob("*.log"))
        
        return list(set(log_files))  # Remove duplicates
    
    def _parse_log_line(self, line: str) -> Dict[str, Any]:
        """Parse a log line to extract structured information."""
        # Common log patterns
        patterns = [
            # ISO format: 2024-01-15T10:30:45.123456+01:00
            r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2})?)',
            # Simple format: 2024-01-15 10:30:45
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})',
            # Level patterns
            r'(DEBUG|INFO|WARNING|ERROR|CRITICAL)',
            # Module/logger patterns
            r'(\w+(?:\.\w+)*)',
        ]
        
        parsed = {
            "raw_line": line.strip(),
            "timestamp": None,
            "level": None,
            "module": None,
            "message": line.strip()
        }
        
        # Extract timestamp
        for pattern in patterns[:2]:
            match = re.search(pattern, line)
            if match:
                parsed["timestamp"] = match.group(1)
                break
        
        # Extract log level
        level_match = re.search(patterns[2], line)
        if level_match:
            parsed["level"] = level_match.group(1)
        
        # Extract module/logger
        module_match = re.search(patterns[3], line)
        if module_match:
            parsed["module"] = module_match.group(1)
        
        return parsed
    
    def _filter_by_level(self, entries: List[Dict[str, Any]], level: str) -> List[Dict[str, Any]]:
        """Filter log entries by level."""
        level_priority = {
            "DEBUG": 0,
            "INFO": 1,
            "WARNING": 2,
            "ERROR": 3,
            "CRITICAL": 4
        }
        
        target_priority = level_priority.get(level.upper(), 1)
        
        filtered = []
        for entry in entries:
            entry_level = entry.get("level", "INFO")
            entry_priority = level_priority.get(entry_level, 1)
            
            if entry_priority >= target_priority:
                filtered.append(entry)
        
        return filtered
    
    def _read_log_file(self, file_path: str, lines: int = 100) -> List[Dict[str, Any]]:
        """Read log file and return parsed entries."""
        entries = []
        
        try:
            if not os.path.exists(file_path):
                return entries
            
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                # Read last N lines
                all_lines = f.readlines()
                last_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
                
                for line in last_lines:
                    if line.strip():
                        parsed = self._parse_log_line(line)
                        entries.append(parsed)
            
            # Reverse to get chronological order (newest last)
            entries.reverse()
            
        except Exception as e:
            logger.error(f"Error reading log file {file_path}: {e}")
        
        return entries
    
    async def execute(self, parameters: LogAccessParameters) -> LogAccessResult:
        """Execute log access and filtering."""
        log_file = parameters.log_file
        level = parameters.level or "INFO"
        lines = parameters.lines or 100
        
        try:
            all_entries = []
            
            if log_file:
                # Read specific log file
                if not os.path.isabs(log_file):
                    # Try relative to logs directory
                    log_file = os.path.join(self.log_directory, log_file)
                
                entries = self._read_log_file(log_file, lines)
                all_entries.extend(entries)
                accessed_file = log_file
            else:
                # Read all available log files
                log_files = self._get_log_files()
                accessed_file = "multiple"
                
                for file_path in log_files:
                    entries = self._read_log_file(file_path, lines // len(log_files) if log_files else lines)
                    all_entries.extend(entries)
            
            # Filter by level
            filtered_entries = self._filter_by_level(all_entries, level)
            
            # Limit total entries
            if len(filtered_entries) > lines:
                filtered_entries = filtered_entries[:lines]
            
            logger.info(f"Log access completed", file=accessed_file, level=level, entries_found=len(filtered_entries))
            
            return LogAccessResult(
                success=True,
                message=f"Retrieved {len(filtered_entries)} log entries",
                log_entries=filtered_entries,
                total_entries=len(all_entries),
                log_file=accessed_file
            )
            
        except Exception as e:
            logger.error(f"Log access failed", error=str(e))
            return LogAccessResult(
                success=False,
                message=f"Failed to access logs: {str(e)}",
                data={"error": str(e)}
            )
