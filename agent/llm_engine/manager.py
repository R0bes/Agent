# agent/llm_engine/manager.py
from agent.utils.log import get_logger
from .model import OllamaGPTOSS20B, LMStudioModel, OllamaModel
from agent.utils.config import config

logger = get_logger(__name__)

class LLMManager:
    """Manages LLM models and provides a unified interface"""
    
    def __init__(self):
        self.models = {}
        self._register_default_models()
    
    def _register_default_models(self):
        # Register default models
        self.models["ollama:gpt-oss:20b"] = OllamaGPTOSS20B(config.llm_base_url)
        
        # Auto-detect and register based on config
        self._auto_register_provider()

    def _auto_register_provider(self):
        """Auto-detect and register the appropriate provider based on config"""
        base_url = config.llm_base_url
        model_name = config.llm_model
        provider = config.llm_provider
        
        if provider == "auto":
            # Auto-detect based on port
            if "localhost:1234" in base_url or "127.0.0.1:1234" in base_url:
                provider = "lmstudio"
            elif "localhost:11434" in base_url or "127.0.0.1:11434" in base_url:
                provider = "ollama"
            else:
                # Default to Ollama if port is unknown
                provider = "ollama"
        
        if provider == "lmstudio":
            if f"lmstudio:{model_name}" not in self.models:
                self.models[f"lmstudio:{model_name}"] = LMStudioModel(model_name, base_url)
                logger.info(f"Registered LM Studio model: {model_name}")
        elif provider == "ollama":
            if f"ollama:{model_name}" not in self.models:
                self.models[f"ollama:{model_name}"] = OllamaModel(model_name, base_url)
                logger.info(f"Registered Ollama model: {model_name}")
        else:
            logger.warning(f"Unknown provider '{provider}', defaulting to Ollama")
            if f"ollama:{model_name}" not in self.models:
                self.models[f"ollama:{model_name}"] = OllamaModel(model_name, base_url)

    def register_model(self, model_key: str, model_instance):
        """Register a custom model instance"""
        self.models[model_key] = model_instance
        logger.info(f"Registered custom model: {model_key}")
    
    def get(self, model_key: str):
        if model_key not in self.models:
            # Try to auto-register if it's a known provider format
            if model_key.startswith("ollama:"):
                model_name = model_key.split(":", 1)[1]
                model_instance = OllamaModel(model_name, config.llm_base_url)
                self.models[model_key] = model_instance
                logger.info(f"Auto-registered Ollama model: {model_key}")
            elif model_key.startswith("lmstudio:"):
                model_name = model_key.split(":", 1)[1]
                model_instance = LMStudioModel(model_name, config.llm_base_url)
                self.models[model_key] = model_instance
                logger.info(f"Auto-registered LM Studio model: {model_key}")
            else:
                raise ValueError(f"Model '{model_key}' not registered and cannot be auto-registered")
        
        return self.models[model_key]
    
    async def generate(self, prompt: str, model_key: str = None, **kwargs) -> str:
        if model_key is None:
            # Use default based on config
            base_url = config.llm_base_url
            if "localhost:1234" in base_url or "127.0.0.1:1234" in base_url:
                model_key = f"lmstudio:{config.llm_model}"
            else:
                model_key = f"ollama:{config.llm_model}"
        
        model = self.get(model_key)
        return await model.generate(prompt, **kwargs)

    def list_available_models(self):
        """List all registered model keys"""
        return list(self.models.keys())

llm_manager = LLMManager()
