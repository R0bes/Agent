# agent/llm_engine/lm_studio_provider.py
from ..provider import LLMProvider
import aiohttp
from typing import Optional, Dict, Any, List, AsyncGenerator
import json
from agent.utils.log import get_logger
from agent.utils.config import config

logger = get_logger(__name__)

class LMStudioProvider(LLMProvider):
    """LM Studio API implementation"""
    
    def __init__(self, base_url: str = None):
        if base_url is None:
            base_url = config.llm_base_url
        super().__init__(base_url)
        self.default_model = config.llm_model
        self.default_max_tokens = 512

    async def generate(self, model: str, prompt: str, **kwargs) -> str:
        url = f"{self.base_url}/v1/chat/completions"
        
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }
        
        # Add parameters
        if "max_tokens" in kwargs:
            payload["max_tokens"] = kwargs["max_tokens"]
        if "temperature" in kwargs:
            payload["temperature"] = kwargs["temperature"]
        if "top_p" in kwargs:
            payload["top_p"] = kwargs["top_p"]
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        error_text = await response.text()
                        logger.error(f"LM Studio API error: {response.status} - {error_text}")
                        raise Exception(f"LM Studio API error: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Error calling LM Studio API: {e}")
            raise

    async def stream_generate(self, model: str, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        url = f"{self.base_url}/v1/chat/completions"
        
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": True
        }
        
        # Add parameters
        if "max_tokens" in kwargs:
            payload["max_tokens"] = kwargs["max_tokens"]
        if "temperature" in kwargs:
            payload["temperature"] = kwargs["temperature"]
        if "top_p" in kwargs:
            payload["top_p"] = kwargs["top_p"]
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        async for line in response.content:
                            line = line.decode('utf-8').strip()
                            if line.startswith("data: "):
                                data_str = line[6:]  # Remove "data: " prefix
                                if data_str == "[DONE]":
                                    break
                                try:
                                    data = json.loads(data_str)
                                    if "choices" in data and len(data["choices"]) > 0:
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            yield delta["content"]
                                except json.JSONDecodeError:
                                    continue
                    else:
                        error_text = await response.text()
                        logger.error(f"LM Studio streaming API error: {response.status} - {error_text}")
                        raise Exception(f"LM Studio streaming API error: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Error calling LM Studio streaming API: {e}")
            raise

    async def list_models(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/v1/models"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("data", [])
                    else:
                        error_text = await response.text()
                        logger.error(f"LM Studio list models error: {response.status} - {error_text}")
                        return []
        except Exception as e:
            logger.error(f"Error listing LM Studio models: {e}")
            return []

    async def check_server(self) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/v1/models", timeout=5) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Error checking LM Studio server: {e}")
            return False
