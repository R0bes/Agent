# agent/llm_engine/ollama_provider.py
from ..provider import LLMProvider
import aiohttp
import asyncio
from typing import Optional, Dict, Any, AsyncGenerator
import json
from agent.utils.log import get_logger

logger = get_logger(__name__)

class OllamaProvider(LLMProvider):
    """Ollama API implementation"""
    
    def __init__(self, base_url: str = None):
        if base_url is None:
            from agent.utils.config import config
            base_url = config.llm_base_url
        super().__init__(base_url)
        self.default_model = "gpt-oss:20b"
        self.default_max_tokens = 512

    async def generate(self, model: str, prompt: str, **kwargs) -> str:
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        
        # Add options for Ollama
        if "max_tokens" in kwargs or "temperature" in kwargs or "top_p" in kwargs:
            payload["options"] = {}
            
        # Set specific parameters
        if "max_tokens" in kwargs:
            payload["options"]["num_predict"] = kwargs["max_tokens"]
        if "temperature" in kwargs:
            payload["options"]["temperature"] = kwargs["temperature"]
        if "top_p" in kwargs:
            payload["options"]["top_p"] = kwargs["top_p"]
        
        # Add any other options
        for key, value in kwargs.items():
            if key not in ["max_tokens", "temperature", "top_p"]:
                payload["options"][key] = value
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("response", "")
                    else:
                        error_text = await response.text()
                        logger.error(f"Ollama API error: {response.status} - {error_text}")
                        raise Exception(f"Ollama API error: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Error calling Ollama API: {e}")
            raise

    async def stream_generate(self, model: str, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True
        }
        
        # Add options for Ollama
        if "max_tokens" in kwargs or "temperature" in kwargs or "top_p" in kwargs:
            payload["options"] = {}
            
        # Set specific parameters
        if "max_tokens" in kwargs:
            payload["options"]["num_predict"] = kwargs["max_tokens"]
        if "temperature" in kwargs:
            payload["options"]["temperature"] = kwargs["temperature"]
        if "top_p" in kwargs:
            payload["options"]["top_p"] = kwargs["top_p"]
        
        # Add any other options
        for key, value in kwargs.items():
            if key not in ["max_tokens", "temperature", "top_p"]:
                payload["options"][key] = value
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        async for line in response.content:
                            line = line.decode('utf-8').strip()
                            if line:
                                try:
                                    data = json.loads(line)
                                    if "response" in data:
                                        yield data["response"]
                                    if data.get("done", False):
                                        break
                                except json.JSONDecodeError:
                                    continue
                    else:
                        error_text = await response.text()
                        logger.error(f"Ollama streaming API error: {response.status} - {error_text}")
                        raise Exception(f"Ollama streaming API error: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Error calling Ollama streaming API: {e}")
            raise

    async def list_models(self):
        url = f"{self.base_url}/api/tags"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("models", [])
                    else:
                        error_text = await response.text()
                        logger.error(f"Ollama list models error: {response.status} - {error_text}")
                        return []
        except Exception as e:
            logger.error(f"Error listing Ollama models: {e}")
            return []

    async def check_server(self) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/api/tags", timeout=5) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Error checking Ollama server: {e}")
            return False
