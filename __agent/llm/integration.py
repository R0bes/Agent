import asyncio
import aiohttp
import time
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import structlog
from pydantic import BaseModel, Field
import tiktoken
from datetime import datetime, timedelta

logger = structlog.get_logger(__name__)

class LLMProviderType(str, Enum):
    """Supported LLM Providers"""
    OLLAMA = "ollama"
    LMSTUDIO = "lmstudio"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"

class LLMRole(str, Enum):
    """Message Roles"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    FUNCTION = "function"

@dataclass
class LLMMessage:
    """Structured LLM Message"""
    role: LLMRole
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class LLMResponse:
    """LLM Response Container"""
    content: str
    model: str
    provider: LLMProvider
    tokens_used: int
    cost: float = 0.0
    latency: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class LLMConfig:
    """LLM Configuration"""
    provider: LLMProvider
    model: str
    base_url: str
    api_key: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 30
    max_retries: int = 3
    cost_per_1k_tokens: float = 0.0

class PromptTemplate(BaseModel):
    """Structured Prompt Template"""
    name: str
    template: str
    variables: List[str] = Field(default_factory=list)
    system_prompt: Optional[str] = None
    examples: List[Dict[str, str]] = Field(default_factory=list)
    validation_rules: Dict[str, Any] = Field(default_factory=dict)

class LLMProvider(ABC):
    """Abstract LLM Provider Interface"""
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            connector=aiohttp.TCPConnector(limit=10, limit_per_host=5)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def generate(self, 
                      messages: List[LLMMessage],
                      **kwargs) -> LLMResponse:
        """Generate response from messages"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is healthy"""
        pass

class OllamaProvider(LLMProviderBase):
    """Ollama Local LLM Provider"""
    
    async def generate(self, 
                      messages: List[LLMMessage],
                      **kwargs) -> LLMResponse:
        start_time = time.time()
        
        # Convert messages to Ollama format
        ollama_messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
        ]
        
        payload = {
            "model": self.config.model,
            "messages": ollama_messages,
            "options": {
                "temperature": kwargs.get("temperature", self.config.temperature),
                "num_predict": kwargs.get("max_tokens", self.config.max_tokens),
            }
        }
        
        async with self.session.post(
            f"{self.config.base_url}/api/chat",
            json=payload
        ) as response:
            if response.status != 200:
                raise Exception(f"Ollama API error: {response.status}")
            
            result = await response.json()
            latency = time.time() - start_time
            
            return LLMResponse(
                content=result["message"]["content"],
                model=self.config.model,
                provider=LLMProviderType.OLLAMA,
                tokens_used=self._estimate_tokens(result["message"]["content"]),
                latency=latency,
                metadata={
                    "done": result.get("done", True),
                    "total_duration": result.get("total_duration", 0),
                    "eval_count": result.get("eval_count", 0)
                }
            )
    
    async def health_check(self) -> bool:
        try:
            async with self.session.get(f"{self.config.base_url}/api/tags") as response:
                return response.status == 200
        except:
            return False
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation"""
        return len(text.split()) * 1.3

class OpenAIProvider(LLMProviderBase):
    """OpenAI API Provider"""
    
    async def generate(self, 
                      messages: List[LLMMessage],
                      **kwargs) -> LLMResponse:
        start_time = time.time()
        
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }
        
        # Convert messages to OpenAI format
        openai_messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
        ]
        
        payload = {
            "model": self.config.model,
            "messages": openai_messages,
            "temperature": kwargs.get("temperature", self.config.temperature),
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }
        
        async with self.session.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers=headers
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"OpenAI API error: {response.status} - {error_text}")
            
            result = await response.json()
            latency = time.time() - start_time
            
            choice = result["choices"][0]
            usage = result["usage"]
            
            return LLMResponse(
                content=choice["message"]["content"],
                model=self.config.model,
                provider=LLMProviderType.OPENAI,
                tokens_used=usage["total_tokens"],
                cost=usage["total_tokens"] * self.config.cost_per_1k_tokens / 1000,
                latency=latency,
                metadata={
                    "finish_reason": choice["finish_reason"],
                    "prompt_tokens": usage["prompt_tokens"],
                    "completion_tokens": usage["completion_tokens"]
                }
            )
    
    async def health_check(self) -> bool:
        try:
            headers = {"Authorization": f"Bearer {self.config.api_key}"}
            async with self.session.get(
                "https://api.openai.com/v1/models",
                headers=headers
            ) as response:
                return response.status == 200
        except:
            return False

class AnthropicProvider(LLMProvider):
    """Anthropic Claude API Provider"""
    
    async def generate(self, 
                      messages: List[LLMMessage],
                      **kwargs) -> LLMResponse:
        start_time = time.time()
        
        headers = {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Convert messages to Anthropic format
        system_msg = next((msg.content for msg in messages if msg.role == LLMRole.SYSTEM), None)
        user_messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages if msg.role != LLMRole.SYSTEM
        ]
        
        payload = {
            "model": self.config.model,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "messages": user_messages,
            "temperature": kwargs.get("temperature", self.config.temperature)
        }
        
        if system_msg:
            payload["system"] = system_msg
        
        async with self.session.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers=headers
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Anthropic API error: {response.status} - {error_text}")
            
            result = await response.json()
            latency = time.time() - start_time
            
            return LLMResponse(
                content=result["content"][0]["text"],
                model=self.config.model,
                provider=LLMProvider.ANTHROPIC,
                tokens_used=result["usage"]["input_tokens"] + result["usage"]["output_tokens"],
                cost=(result["usage"]["input_tokens"] + result["usage"]["output_tokens"]) * self.config.cost_per_1k_tokens / 1000,
                latency=latency,
                metadata={
                metadata={
                    "input_tokens": result["usage"]["input_tokens"],
                    "output_tokens": result["usage"]["output_tokens"],
                    "stop_reason": result.get("stop_reason")
                }
            )
    
    async def health_check(self) -> bool:
        # Anthropic doesn't have a simple health endpoint
        return True

class LLMLoadBalancer:
    """Load Balancer für multiple LLM instances"""
    
    def __init__(self, configs: List[LLMConfig]):
        self.providers: List[LLMProviderBase] = []
        self.current_index = 0
        self.health_status: Dict[int, bool] = {}
        
        # Initialize providers
        for config in configs:
            if config.provider == LLMProviderType.OLLAMA:
                provider = OllamaProvider(config)
            elif config.provider == LLMProviderType.OPENAI:
                provider = OpenAIProvider(config)
            elif config.provider == LLMProviderType.ANTHROPIC:
                provider = AnthropicProvider(config)
            else:
                continue
            
            self.providers.append(provider)
            self.health_status[len(self.providers) - 1] = True
    
    async def get_next_provider(self) -> Optional[LLMProviderBase]:
        """Get next healthy provider using round-robin"""
        for _ in range(len(self.providers)):
            if self.health_status.get(self.current_index, False):
                provider = self.providers[self.current_index]
                self.current_index = (self.current_index + 1) % len(self.providers)
                return provider
            
            self.current_index = (self.current_index + 1) % len(self.providers)
        
        return None
    
    async def health_check_all(self):
        """Check health of all providers"""
        for i, provider in enumerate(self.providers):
            try:
                async with provider:
                    self.health_status[i] = await provider.health_check()
            except:
                self.health_status[i] = False
        
        healthy_count = sum(self.health_status.values())
        logger.info("Provider health check completed",
                   total_providers=len(self.providers),
                   healthy_providers=healthy_count)

class PromptManager:
    """Advanced Prompt Template Management"""
    
    def __init__(self):
        self.templates: Dict[str, PromptTemplate] = {}
        self.load_default_templates()
    
    def load_default_templates(self):
        """Load standard prompt templates"""
        
        # Analysis Template
        self.register_template(PromptTemplate(
            name="analysis",
            system_prompt="Du bist ein erfahrener Analyst. Analysiere die gegebenen Informationen systematisch und strukturiert.",
            template="""
Aufgabe: {task_description}

Kontext:
{context}

Zu analysierende Daten:
{data}

Führe eine detaillierte Analyse durch und strukturiere deine Antwort nach:
1. Überblick
2. Haupterkenntnisse  
3. Problembereiche
4. Empfehlungen
""",
            variables=["task_description", "context", "data"]
        ))
        
        # Planning Template
        self.register_template(PromptTemplate(
            name="planning",
            system_prompt="Du bist ein strategischer Planer. Entwickle detaillierte, umsetzbare Pläne.",
            template="""
Ziel: {objective}

Verfügbare Ressourcen:
{resources}

Constraints:
{constraints}

Erstelle einen detaillierten Umsetzungsplan mit:
1. Schritt-für-Schritt Anweisungen
2. Zeitschätzungen
3. Benötigte Tools/Ressourcen
4. Risikobewertung
5. Erfolgskriterien
""",
            variables=["objective", "resources", "constraints"]
        ))
        
        # Execution Template
        self.register_template(PromptTemplate(
            name="execution",
            system_prompt="Du bist ein Execution-Spezialist. Führe Aufgaben präzise und effizient aus.",
            template="""
Auszuführende Aufgabe: {task}

Parameter:
{parameters}

Verfügbare Tools:
{available_tools}

Führe die Aufgabe aus und dokumentiere jeden Schritt. Bei Fehlern, erkläre das Problem und schlage Lösungen vor.
""",
            variables=["task", "parameters", "available_tools"]
        ))
    
    def register_template(self, template: PromptTemplate):
        """Register new prompt template"""
        self.templates[template.name] = template
        logger.info("Prompt template registered", name=template.name)
    
    def render_template(self, template_name: str, variables: Dict[str, Any]) -> List[LLMMessage]:
        """Render prompt template with variables"""
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' not found")
        
        template = self.templates[template_name]
        
        # Validate required variables
        missing_vars = set(template.variables) - set(variables.keys())
        if missing_vars:
            raise ValueError(f"Missing required variables: {missing_vars}")
        
        # Render template
        rendered_content = template.template.format(**variables)
        
        messages = []
        if template.system_prompt:
            messages.append(LLMMessage(
                role=LLMRole.SYSTEM,
                content=template.system_prompt
            ))
        
        messages.append(LLMMessage(
            role=LLMRole.USER,
            content=rendered_content
        ))
        
        return messages

class TokenManager:
    """Token Usage and Cost Management"""
    
    def __init__(self):
        self.usage_stats: Dict[str, Dict[str, Any]] = {}
        self.cost_tracking: Dict[str, float] = {}
        
    def track_usage(self, 
                   provider: str,
                   model: str,
                   tokens_used: int,
                   cost: float,
                   request_type: str = "chat"):
        """Track token usage and costs"""
        
        key = f"{provider}:{model}"
        
        if key not in self.usage_stats:
            self.usage_stats[key] = {
                "total_tokens": 0,
                "total_requests": 0,
                "total_cost": 0.0,
                "avg_tokens_per_request": 0,
                "last_used": None
            }
        
        stats = self.usage_stats[key]
        stats["total_tokens"] += tokens_used
        stats["total_requests"] += 1
        stats["total_cost"] += cost
        stats["avg_tokens_per_request"] = stats["total_tokens"] / stats["total_requests"]
        stats["last_used"] = datetime.utcnow().isoformat()
        
        # Update cost tracking by date
        today = datetime.utcnow().date().isoformat()
        if today not in self.cost_tracking:
            self.cost_tracking[today] = 0.0
        self.cost_tracking[today] += cost
        
        logger.info("Token usage tracked",
                   provider=provider,
                   model=model,
                   tokens=tokens_used,
                   cost=cost,
                   daily_cost=self.cost_tracking[today])
    
    def get_usage_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get usage statistics"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_costs = {
            date: cost for date, cost in self.cost_tracking.items()
            if datetime.fromisoformat(date) >= cutoff_date.date()
        }
        
        return {
            "model_stats": self.usage_stats,
            "recent_costs": recent_costs,
            "total_recent_cost": sum(recent_costs.values()),
            "avg_daily_cost": sum(recent_costs.values()) / max(len(recent_costs), 1)
        }

class ContextWindowManager:
    """Smart Context Window Management"""
    
    def __init__(self, max_tokens: int = 4096):
        self.max_tokens = max_tokens
        self.encoding = tiktoken.get_encoding("cl100k_base")  # GPT-4 encoding
        
    def count_tokens(self, messages: List[LLMMessage]) -> int:
        """Count tokens in message list"""
        total_tokens = 0
        
        for message in messages:
            # Rough approximation for message formatting overhead
            total_tokens += 4  # Role and formatting tokens
            total_tokens += len(self.encoding.encode(message.content))
        
        return total_tokens
    
    def fit_context(self, 
                   messages: List[LLMMessage],
                   preserve_system: bool = True,
                   preserve_last_n: int = 1) -> List[LLMMessage]:
        """Fit messages within context window"""
        
        if self.count_tokens(messages) <= self.max_tokens:
            return messages
        
        # Separate system messages and preserve them
        system_messages = [msg for msg in messages if msg.role == LLMRole.SYSTEM]
        other_messages = [msg for msg in messages if msg.role != LLMRole.SYSTEM]
        
        # Always preserve system messages and last N messages
        preserved_messages = system_messages if preserve_system else []
        preserved_messages.extend(other_messages[-preserve_last_n:])
        
        # Add as many earlier messages as possible
        remaining_messages = other_messages[:-preserve_last_n] if preserve_last_n > 0 else other_messages
        
        while remaining_messages:
            test_messages = preserved_messages + remaining_messages
            if self.count_tokens(test_messages) <= self.max_tokens:
                break
            remaining_messages.pop(0)  # Remove oldest message
        
        final_messages = preserved_messages + remaining_messages
        
        if len(final_messages) < len(messages):
            logger.warning("Context window truncated",
                          original_messages=len(messages),
                          final_messages=len(final_messages),
                          tokens_saved=self.count_tokens(messages) - self.count_tokens(final_messages))
        
        return final_messages
    
    def compress_context(self, 
                        messages: List[LLMMessage],
                        compression_ratio: float = 0.5) -> List[LLMMessage]:
        """Compress context using summarization"""
        
        if len(messages) <= 2:  # Not enough to compress
            return messages
        
        # Keep system message and last message, compress middle ones
        system_msgs = [msg for msg in messages if msg.role == LLMRole.SYSTEM]
        middle_msgs = messages[len(system_msgs):-1]
        last_msg = messages[-1:]
        
        if not middle_msgs:
            return messages
        
        # Create summary of middle messages
        summary_content = self._create_summary(middle_msgs)
        summary_msg = LLMMessage(
            role=LLMRole.USER,
            content=f"[CONTEXT SUMMARY: {summary_content}]",
            metadata={"compressed": True, "original_count": len(middle_msgs)}
        )
        
        compressed_messages = system_msgs + [summary_msg] + last_msg
        
        logger.info("Context compressed",
                   original_messages=len(messages),
                   compressed_messages=len(compressed_messages),
                   compression_ratio=len(compressed_messages) / len(messages))
        
        return compressed_messages
    
    def _create_summary(self, messages: List[LLMMessage]) -> str:
        """Create summary of message sequence"""
        
        # Simple extractive summary - in production use dedicated summarization
        content_parts = []
        for msg in messages:
            if len(msg.content) > 200:
                content_parts.append(msg.content[:200] + "...")
            else:
                content_parts.append(msg.content)
        
        return " | ".join(content_parts)

class LLMOrchestrator:
    """Main LLM Orchestration Engine"""
    
    def __init__(self, configs: List[LLMConfig]):
        self.load_balancer = LLMLoadBalancer(configs)
        self.prompt_manager = PromptManager()
        self.token_manager = TokenManager()
        self.context_manager = ContextWindowManager()
        self.fallback_chain = self._build_fallback_chain(configs)
        
    def _build_fallback_chain(self, configs: List[LLMConfig]) -> List[LLMProviderBase]:
        """Build fallback chain by reliability"""
        
        # Sort by provider reliability (local first, then cloud)
        priority_order = [
            LLMProviderType.OLLAMA,
            LLMProviderType.LMSTUDIO, 
            LLMProviderType.OPENAI,
            LLMProviderType.ANTHROPIC
        ]
        
        sorted_configs = sorted(configs, 
                               key=lambda c: priority_order.index(c.provider) 
                               if c.provider in priority_order else 999)
        
        return [self._create_provider(config) for config in sorted_configs]
    
    def _create_provider(self, config: LLMConfig) -> LLMProviderBase:
        """Create provider instance"""
        if config.provider == LLMProviderType.OLLAMA:
            return OllamaProvider(config)
        elif config.provider == LLMProviderType.OPENAI:
            return OpenAIProvider(config)
        elif config.provider == LLMProviderType.ANTHROPIC:
            return AnthropicProvider(config)
        else:
            raise ValueError(f"Unsupported provider: {config.provider}")
    
    async def generate_with_template(self,
                                   template_name: str,
                                   variables: Dict[str, Any],
                                   **kwargs) -> LLMResponse:
        """Generate response using prompt template"""
        
        messages = self.prompt_manager.render_template(template_name, variables)
        return await self.generate(messages, **kwargs)
    
    async def generate(self, 
                      messages: List[LLMMessage],
                      max_retries: int = 3,
                      fallback_enabled: bool = True,
                      **kwargs) -> LLMResponse:
        """Generate response with load balancing and fallbacks"""
        
        # Fit messages within context window
        fitted_messages = self.context_manager.fit_context(messages)
        
        last_error = None
        
        # Try primary load balancer first
        for attempt in range(max_retries):
            try:
                provider = await self.load_balancer.get_next_provider()
                if provider:
                    async with provider:
                        response = await provider.generate(fitted_messages, **kwargs)
                        
                        # Track usage
                        self.token_manager.track_usage(
                            provider=response.provider.value,
                            model=response.model,
                            tokens_used=response.tokens_used,
                            cost=response.cost
                        )
                        
                        return response
                
            except Exception as e:
                last_error = e
                logger.warning("Primary provider failed",
                             attempt=attempt + 1,
                             error=str(e))
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        # Fallback to alternative providers
        if fallback_enabled:
            for provider in self.fallback_chain:
                try:
                    async with provider:
                        if await provider.health_check():
                            response = await provider.generate(fitted_messages, **kwargs)
                            
                            logger.info("Fallback provider succeeded",
                                       provider=provider.config.provider.value)
                            
                            self.token_manager.track_usage(
                                provider=response.provider.value,
                                model=response.model,
                                tokens_used=response.tokens_used,
                                cost=response.cost
                            )
                            
                            return response
                            
                except Exception as e:
                    logger.warning("Fallback provider failed",
                                 provider=provider.config.provider.value,
                                 error=str(e))
                    continue
        
        # All providers failed
        raise Exception(f"All LLM providers failed. Last error: {last_error}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Complete system health check"""
        
        await self.load_balancer.health_check_all()
        
        health_status = {
            "primary_providers": self.load_balancer.health_status,
            "fallback_available": len(self.fallback_chain) > 0,
            "total_providers": len(self.load_balancer.providers),
            "healthy_providers": sum(self.load_balancer.health_status.values()),
            "usage_stats": self.token_manager.get_usage_stats(7),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return health_status