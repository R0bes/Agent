# agent/llm_engine/handler.py
import asyncio
from typing import Optional, Dict, Any, AsyncGenerator
from .manager import llm_manager
from agent.utils.log import get_logger
from agent.utils.config import config

logger = get_logger(__name__)

class LLMHandler:
    """LLM Handler for reasoning tasks"""
    
    def __init__(self, model_key: str = None):
        self.model_key = model_key
        if model_key:
            self.model = llm_manager.get(model_key)
        else:
            self.model = None
        
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text using the configured LLM model"""
        try:
            # If no specific model is set, use the manager's generate method
            if not self.model:
                logger.info("No specific model set, using manager's default model")
                return await llm_manager.generate(prompt, **kwargs)
            
            logger.info("Generating LLM response", model=self.model_key, prompt_length=len(prompt))
            
            # Update provider settings from config
            if hasattr(self.model.provider, "base_url"):
                self.model.provider.base_url = config.llm_base_url
            if hasattr(self.model, "model_name") and config.llm_model:
                self.model.model_name = config.llm_model
                
            response = await self.model.generate(prompt, **kwargs)
            logger.info("LLM response generated", response_length=len(response))
            return response
        except Exception as e:
            logger.error("LLM generation failed", error=str(e))
            return f"Error generating response: {e}"

    async def stream_generate(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        """Stream text chunks using the configured LLM model"""
        try:
            # If no specific model is set, use the manager's default model
            if not self.model:
                logger.info("No specific model set, using manager's default model for streaming")
                # Get the default model from manager
                default_model_key = None
                base_url = config.llm_base_url
                if "localhost:1234" in base_url or "127.0.0.1:1234" in base_url:
                    default_model_key = f"lmstudio:{config.llm_model}"
                else:
                    default_model_key = f"ollama:{config.llm_model}"
                
                model = llm_manager.get(default_model_key)
                provider = model.provider
            else:
                provider = self.model.provider
            
            # only supported for providers with stream_generate
            if provider is None or not hasattr(provider, 'stream_generate'):
                # fallback to non-streaming
                yield await self.generate(prompt, **kwargs)
                return
            
            # Update provider settings from config
            if hasattr(provider, "base_url"):
                provider.base_url = config.llm_base_url
            
            model_name = getattr(self.model, 'model_name', config.llm_model) if self.model else config.llm_model
            
            async for chunk in provider.stream_generate(model_name, prompt, **kwargs):
                yield chunk
        except Exception as e:
            logger.error("Streaming generation failed", error=str(e))
            # Fallback to non-streaming
            yield await self.generate(prompt, **kwargs)
    
    async def check_connection(self) -> bool:
        """Check if the LLM server is available"""
        try:
            _ = await self.generate("Hello", max_tokens=10)
            return True
        except Exception as e:
            logger.error("LLM connection check failed", error=str(e))
            return False
