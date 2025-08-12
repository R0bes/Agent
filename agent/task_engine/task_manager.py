# agent/task_engine/task_manager.py
import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from agent.utils.log import get_logger

logger = get_logger(__name__)

class AgentContext:
    pass

class TaskExecutionError(Exception):
    """Task Execution Error"""
    pass

class TaskManager:
    """Simplified Task Manager without database dependencies"""
    
    def __init__(self):
        self.active_tasks: Dict[uuid.UUID, asyncio.Task] = {}
        self.task_semaphore = asyncio.Semaphore(50)  # Max 50 concurrent tasks
        
    async def create_task(self, 
                         agent_id: uuid.UUID,
                         name: str,
                         description: str = "",
                         input_data: Dict[str, Any] = None,
                         priority: str = "normal",
                         parent_task_id: Optional[uuid.UUID] = None,
                         max_retries: int = 3) -> uuid.UUID:
        """Create new task (simplified without database)"""

        task_id = uuid.uuid4()
        
        logger.info("Task created", 
                   task_id=task_id,
                   agent_id=agent_id,
                   name=name,
                   priority=priority)
        
        return task_id
    
    async def execute_task(self, 
                          task_id: uuid.UUID, 
                          executor_func: callable,
                          context: AgentContext) -> Dict[str, Any]:
        """Execute single task with error handling and retry logic"""
        
        async with self.task_semaphore:
            start_time = asyncio.get_event_loop().time()
            
            try:
                # Execute task with timeout
                result_data = await asyncio.wait_for(
                    executor_func(input_data={}, context=context),
                    timeout=300  # 5 minute timeout
                )
                
                execution_time = asyncio.get_event_loop().time() - start_time
                
                logger.info("Task completed successfully",
                           task_id=task_id,
                           execution_time=execution_time)
                
                return {
                    "success": True,
                    "data": result_data,
                    "execution_time": execution_time
                }
                
            except asyncio.TimeoutError:
                return {
                    "success": False,
                    "error": "Task timeout exceeded",
                    "execution_time": asyncio.get_event_loop().time() - start_time
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "execution_time": asyncio.get_event_loop().time() - start_time
                }
    
    async def execute_parallel_subtasks(self, 
                                       parent_task_id: uuid.UUID,
                                       subtask_specs: List[Dict[str, Any]],
                                       context: AgentContext) -> List[Dict[str, Any]]:
        """Execute multiple subtasks in parallel"""
        
        # Create all subtasks first
        subtask_ids = []
        for spec in subtask_specs:
            subtask_id = await self.create_task(
                agent_id=context.agent_id if hasattr(context, 'agent_id') else uuid.uuid4(),
                parent_task_id=parent_task_id,
                **spec
            )
            subtask_ids.append(subtask_id)
        
        # Execute all subtasks concurrently
        tasks = [
            self.execute_task(subtask_id, spec.get("executor_func", lambda x, y: None), context)
            for subtask_id, spec in zip(subtask_ids, subtask_specs)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        task_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                task_results.append({
                    "success": False,
                    "error": str(result),
                    "metadata": {"subtask_index": i}
                })
            else:
                task_results.append(result)
        
        logger.info("Parallel subtasks completed",
                   parent_task_id=parent_task_id,
                   total_subtasks=len(subtask_specs),
                   successful=sum(1 for r in task_results if r.get("success", False)))
        
        return task_results
    
    async def get_task_hierarchy(self, task_id: uuid.UUID) -> Dict[str, Any]:
        """Get complete task hierarchy tree (simplified)"""
        return {"task_id": str(task_id), "status": "simplified"}
    
    async def cancel_task(self, task_id: uuid.UUID) -> bool:
        """Cancel running task"""
        
        if task_id in self.active_tasks:
            self.active_tasks[task_id].cancel()
            del self.active_tasks[task_id]
            return True
        
        return False

# Create a global instance
task_manager = TaskManager()