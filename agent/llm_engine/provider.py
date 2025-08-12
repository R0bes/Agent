# agent/llm_engine/provider.py
import aiohttp
import asyncio
from typing import Optional, Dict, Any
from agent.utils.log import get_logger

logger = get_logger(__name__)

class LLMProvider:
    """Abstract base class for LLM providers"""
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def generate(self, model: str, prompt: str, **kwargs) -> str:
        raise NotImplementedError
