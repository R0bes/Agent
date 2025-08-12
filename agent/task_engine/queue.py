# agent/task_engine/queue.py
import asyncio
from .task import Task, TaskPriority

class Queue:
    """Async priority queue for tasks"""
    def __init__(self):
        self._queue = asyncio.PriorityQueue()

    async def put(self, task: Task):
        await self._queue.put((task.priority, task))

    async def get(self) -> Task:
        _, task = await self._queue.get()
        return task

    def empty(self) -> bool:
        return self._queue.empty()

    def qsize(self) -> int:
        return self._queue.qsize()
