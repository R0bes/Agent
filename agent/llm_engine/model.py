# agent/llm_engine/model.py
from typing import Any, Dict
from .providers.ollama_provider import OllamaProvider
from .providers.lm_studio_provider import LMStudioProvider
from agent.utils.log import get_logger

logger = get_logger(__name__)

class LLMModel:
    """Abstract model wrapper"""
    def __init__(self, provider, model_name: str):
        self.provider = provider
        self.model_name = model_name

    async def generate(self, prompt: str, **kwargs) -> str:
        logger.info("Generating text", model=self.model_name)
        return await self.provider.generate(self.model_name, prompt, **kwargs)

class OllamaGPTOSS20B(LLMModel):
    """Specific model instance for Ollama GPT-OSS:20B"""
    def __init__(self, base_url: str = None):
        if base_url is None:
            from agent.utils.config import config
            base_url = config.llm_base_url
        provider = OllamaProvider(base_url)
        super().__init__(provider, "gpt-oss:20b")

class LMStudioModel(LLMModel):
    """Generic model instance for LM Studio"""
    def __init__(self, model_name: str, base_url: str = None):
        if base_url is None:
            from agent.utils.config import config
            base_url = config.llm_base_url
        provider = LMStudioProvider(base_url)
        super().__init__(provider, model_name)

class OllamaModel(LLMModel):
    """Generic model instance for Ollama"""
    def __init__(self, model_name: str, base_url: str = None):
        if base_url is None:
            from agent.utils.config import config
            base_url = config.llm_base_url
        provider = OllamaProvider(base_url)
        super().__init__(provider, model_name)
