import asyncio
import time
import io
import sys
import traceback
from contextlib import redirect_stdout, redirect_stderr
from typing import Dict, Any
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import CodeExecutionParameters, CodeExecutionResult

logger = get_logger(__name__)

class CodeExecutor(BaseTool):
    """Safe Python code execution tool."""
    
    def __init__(self):
        self.forbidden_modules = {
            'os', 'subprocess', 'sys', 'importlib', 'builtins',
            'ctypes', 'mmap', 'socket', 'multiprocessing'
        }
        self.max_execution_time = 30  # seconds
        super().__init__()
    
    def _get_description(self) -> str:
        return "Execute Python code safely with timeout and output capture. Restricted modules for security."
    
    def _get_parameter_schema(self):
        return CodeExecutionParameters
    
    def _get_result_schema(self):
        return CodeExecutionResult
    
    def _check_security(self, code: str) -> tuple[bool, str]:
        """Check if code is safe to execute."""
        # Check for forbidden imports
        lines = code.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                for module in self.forbidden_modules:
                    if module in line:
                        return False, f"Forbidden module '{module}' detected"
        
        # Check for dangerous operations
        dangerous_patterns = [
            'eval(', 'exec(', '__import__', 'open(', 'file(',
            'subprocess', 'os.system', 'os.popen'
        ]
        
        for pattern in dangerous_patterns:
            if pattern in code:
                return False, f"Dangerous operation '{pattern}' detected"
        
        return True, ""
    
    async def execute(self, parameters: CodeExecutionParameters) -> CodeExecutionResult:
        """Execute Python code safely."""
        code = parameters.code
        timeout = parameters.timeout or self.max_execution_time
        
        # Security check
        is_safe, error_msg = self._check_security(code)
        if not is_safe:
            return CodeExecutionResult(
                success=False,
                message=f"Security check failed: {error_msg}",
                error=error_msg
            )
        
        start_time = time.time()
        
        try:
            # Capture stdout and stderr
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()
            
            # Execute code with timeout
            async def run_code():
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    # Create a restricted globals dict
                    restricted_globals = {
                        '__builtins__': {
                            'print': print,
                            'len': len,
                            'str': str,
                            'int': int,
                            'float': float,
                            'list': list,
                            'dict': dict,
                            'tuple': tuple,
                            'set': set,
                            'range': range,
                            'enumerate': enumerate,
                            'zip': zip,
                            'sum': sum,
                            'max': max,
                            'min': min,
                            'abs': abs,
                            'round': round,
                            'sorted': sorted,
                            'reversed': reversed,
                            'any': any,
                            'all': all,
                            'bool': bool,
                            'type': type,
                            'isinstance': isinstance,
                            'hasattr': hasattr,
                            'getattr': getattr,
                            'setattr': setattr,
                            'dir': dir,
                            'help': help,
                            'repr': repr,
                            'chr': chr,
                            'ord': ord,
                            'bin': bin,
                            'hex': hex,
                            'oct': oct,
                            'format': format,
                            'divmod': divmod,
                            'pow': pow,
                            'hash': hash,
                            'id': id,
                            'callable': callable,
                            'issubclass': issubclass,
                            'super': super,
                            'property': property,
                            'staticmethod': staticmethod,
                            'classmethod': classmethod,
                            'object': object,
                            'Exception': Exception,
                            'BaseException': BaseException,
                            'StopIteration': StopIteration,
                            'GeneratorExit': GeneratorExit,
                            'ArithmeticError': ArithmeticError,
                            'FloatingPointError': FloatingPointError,
                            'OverflowError': OverflowError,
                            'ZeroDivisionError': ZeroDivisionError,
                            'AssertionError': AssertionError,
                            'AttributeError': AttributeError,
                            'BufferError': BufferError,
                            'EOFError': EOFError,
                            'ImportError': ImportError,
                            'ModuleNotFoundError': ModuleNotFoundError,
                            'LookupError': LookupError,
                            'IndexError': IndexError,
                            'KeyError': KeyError,
                            'MemoryError': MemoryError,
                            'NameError': NameError,
                            'UnboundLocalError': UnboundLocalError,
                            'OSError': OSError,
                            'BlockingIOError': BlockingIOError,
                            'ChildProcessError': ChildProcessError,
                            'ConnectionError': ConnectionError,
                            'BrokenPipeError': BrokenPipeError,
                            'ConnectionAbortedError': ConnectionAbortedError,
                            'ConnectionRefusedError': ConnectionRefusedError,
                            'ConnectionResetError': ConnectionResetError,
                            'FileExistsError': FileExistsError,
                            'FileNotFoundError': FileNotFoundError,
                            'InterruptedError': InterruptedError,
                            'IsADirectoryError': IsADirectoryError,
                            'NotADirectoryError': NotADirectoryError,
                            'PermissionError': PermissionError,
                            'ProcessLookupError': ProcessLookupError,
                            'TimeoutError': TimeoutError,
                            'ReferenceError': ReferenceError,
                            'RuntimeError': RuntimeError,
                            'NotImplementedError': NotImplementedError,
                            'RecursionError': RecursionError,
                            'SyntaxError': SyntaxError,
                            'IndentationError': IndentationError,
                            'TabError': TabError,
                            'SystemError': SystemError,
                            'TypeError': TypeError,
                            'ValueError': ValueError,
                            'UnicodeError': UnicodeError,
                            'UnicodeDecodeError': UnicodeDecodeError,
                            'UnicodeEncodeError': UnicodeEncodeError,
                            'UnicodeTranslateError': UnicodeTranslateError,
                            'Warning': Warning,
                            'UserWarning': UserWarning,
                            'DeprecationWarning': DeprecationWarning,
                            'PendingDeprecationWarning': PendingDeprecationWarning,
                            'SyntaxWarning': SyntaxWarning,
                            'RuntimeWarning': RuntimeWarning,
                            'FutureWarning': FutureWarning,
                            'ImportWarning': ImportWarning,
                            'UnicodeWarning': UnicodeWarning,
                            'BytesWarning': BytesWarning,
                            'ResourceWarning': ResourceWarning,
                        }
                    }
                    
                    # Execute the code
                    exec(code, restricted_globals)
            
            # Run with timeout
            await asyncio.wait_for(run_code(), timeout=timeout)
            
            execution_time = time.time() - start_time
            
            # Get output
            stdout_output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()
            
            # Combine outputs
            output = stdout_output
            if stderr_output:
                output += f"\nSTDERR:\n{stderr_output}"
            
            logger.info(f"Code execution completed", execution_time=execution_time, output_length=len(output))
            
            return CodeExecutionResult(
                success=True,
                message=f"Code executed successfully in {execution_time:.2f}s",
                output=output,
                execution_time=execution_time
            )
            
        except asyncio.TimeoutError:
            execution_time = time.time() - start_time
            return CodeExecutionResult(
                success=False,
                message=f"Code execution timed out after {execution_time:.2f}s",
                error="Timeout",
                execution_time=execution_time
            )
        except Exception as e:
            execution_time = time.time() - start_time
            error_traceback = traceback.format_exc()
            logger.error(f"Code execution failed", error=str(e), execution_time=execution_time)
            
            return CodeExecutionResult(
                success=False,
                message=f"Code execution failed: {str(e)}",
                error=error_traceback,
                execution_time=execution_time
            )
