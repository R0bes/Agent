import psutil
import datetime
import platform
from typing import Dict, Any
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import SystemInfoParameters, SystemInfoResult

logger = get_logger(__name__)

class SystemInfo(BaseTool):
    """System information gathering tool."""
    
    def __init__(self):
        super().__init__()
    
    def _get_description(self) -> str:
        return "Gather system information: CPU, memory, disk, datetime, and process details."
    
    def _get_parameter_schema(self):
        return SystemInfoParameters
    
    def _get_result_schema(self):
        return SystemInfoResult
    
    def _get_cpu_info(self) -> Dict[str, Any]:
        """Get CPU information."""
        try:
            cpu_info = {
                "cpu_count": psutil.cpu_count(),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "cpu_percent": psutil.cpu_percent(interval=1),
                "cpu_freq": {
                    "current": psutil.cpu_freq().current if psutil.cpu_freq() else None,
                    "min": psutil.cpu_freq().min if psutil.cpu_freq() else None,
                    "max": psutil.cpu_freq().max if psutil.cpu_freq() else None
                },
                "cpu_stats": {
                    "ctx_switches": psutil.cpu_stats().ctx_switches,
                    "interrupts": psutil.cpu_stats().interrupts,
                    "soft_interrupts": psutil.cpu_stats().soft_interrupts,
                    "syscalls": psutil.cpu_stats().syscalls
                }
            }
            return cpu_info
        except Exception as e:
            logger.error(f"Error getting CPU info: {e}")
            return {"error": str(e)}
    
    def _get_memory_info(self) -> Dict[str, Any]:
        """Get memory information."""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            memory_info = {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "free": memory.free,
                "percent": memory.percent,
                "swap_total": swap.total,
                "swap_used": swap.used,
                "swap_free": swap.free,
                "swap_percent": swap.percent
            }
            return memory_info
        except Exception as e:
            logger.error(f"Error getting memory info: {e}")
            return {"error": str(e)}
    
    def _get_disk_info(self) -> Dict[str, Any]:
        """Get disk information."""
        try:
            disk_info = {}
            
            # Disk partitions
            partitions = []
            for partition in psutil.disk_partitions():
                try:
                    partition_usage = psutil.disk_usage(partition.mountpoint)
                    partitions.append({
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": partition_usage.total,
                        "used": partition_usage.used,
                        "free": partition_usage.free,
                        "percent": partition_usage.percent
                    })
                except PermissionError:
                    continue
            
            disk_info["partitions"] = partitions
            
            # Disk I/O
            try:
                disk_io = psutil.disk_io_counters()
                disk_info["io_counters"] = {
                    "read_count": disk_io.read_count,
                    "write_count": disk_io.write_count,
                    "read_bytes": disk_io.read_bytes,
                    "write_bytes": disk_io.write_bytes
                }
            except Exception:
                disk_info["io_counters"] = None
            
            return disk_info
        except Exception as e:
            logger.error(f"Error getting disk info: {e}")
            return {"error": str(e)}
    
    def _get_datetime_info(self) -> Dict[str, Any]:
        """Get datetime information."""
        now = datetime.datetime.now()
        
        datetime_info = {
            "current_datetime": now.isoformat(),
            "date": now.date().isoformat(),
            "time": now.time().isoformat(),
            "timezone": str(datetime.datetime.now().astimezone().tzinfo),
            "timestamp": now.timestamp(),
            "year": now.year,
            "month": now.month,
            "day": now.day,
            "hour": now.hour,
            "minute": now.minute,
            "second": now.second,
            "weekday": now.weekday(),
            "isoweekday": now.isoweekday()
        }
        return datetime_info
    
    def _get_process_info(self) -> Dict[str, Any]:
        """Get process information."""
        try:
            process_info = {
                "current_process": {
                    "pid": psutil.Process().pid,
                    "name": psutil.Process().name(),
                    "cpu_percent": psutil.Process().cpu_percent(),
                    "memory_percent": psutil.Process().memory_percent(),
                    "memory_info": {
                        "rss": psutil.Process().memory_info().rss,
                        "vms": psutil.Process().memory_info().vms
                    }
                },
                "total_processes": len(psutil.pids()),
                "top_processes": []
            }
            
            # Get top 5 processes by CPU usage
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Sort by CPU usage and get top 5
            processes.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
            process_info["top_processes"] = processes[:5]
            
            return process_info
        except Exception as e:
            logger.error(f"Error getting process info: {e}")
            return {"error": str(e)}
    
    def _get_platform_info(self) -> Dict[str, Any]:
        """Get platform information."""
        platform_info = {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "python_implementation": platform.python_implementation()
        }
        return platform_info
    
    async def execute(self, parameters: SystemInfoParameters) -> SystemInfoResult:
        """Execute system information gathering."""
        info_type = parameters.info_type or "all"
        
        try:
            system_info = {}
            
            if info_type in ["all", "cpu"]:
                system_info["cpu"] = self._get_cpu_info()
            
            if info_type in ["all", "memory"]:
                system_info["memory"] = self._get_memory_info()
            
            if info_type in ["all", "disk"]:
                system_info["disk"] = self._get_disk_info()
            
            if info_type in ["all", "datetime"]:
                system_info["datetime"] = self._get_datetime_info()
            
            if info_type in ["all", "process"]:
                system_info["process"] = self._get_process_info()
            
            if info_type == "all":
                system_info["platform"] = self._get_platform_info()
            
            logger.info(f"System info gathered", info_type=info_type)
            
            return SystemInfoResult(
                success=True,
                message=f"System information gathered successfully",
                system_info=system_info,
                info_type=info_type
            )
            
        except Exception as e:
            logger.error(f"System info gathering failed", error=str(e))
            return SystemInfoResult(
                success=False,
                message=f"Failed to gather system information: {str(e)}",
                data={"error": str(e)}
            )
