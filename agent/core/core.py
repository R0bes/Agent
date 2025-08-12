import asyncio
import uuid
from typing import Any

from agent.task_engine.reasoning_task import ReasoningTask, ReasoningTaskInput
from agent.llm_engine.handler import LLMHandler
from agent.utils.config import config
from agent.utils.log import get_logger, setup_logging

logger = get_logger(__name__)

class StubLLMHandler:
    async def generate(self, prompt: str, **kwargs) -> str:
        # Einfacher Stub der direkt auf die ursprüngliche Anfrage reagiert
        prompt_lower = prompt.lower()
        
        # Extrahiere die ursprüngliche Anfrage aus dem Prompt
        if "original query:" in prompt_lower:
            query_part = prompt.split("Original Query:")[1].split("\n")[0].strip()
        elif "query:" in prompt_lower:
            query_part = prompt.split("query:")[1].split("\n")[0].strip()
        else:
            # Fallback: verwende den gesamten Prompt
            query_part = prompt
        
        # Generiere eine sinnvolle Antwort basierend auf der Anfrage
        query_lower = query_part.lower()
        if "2+2" in query_part or "mathematik" in query_lower or "rechnen" in query_lower:
            return "Die Antwort auf Ihre Frage ist: 2 + 2 = 4. Das ist eine grundlegende mathematische Operation."
        elif "wetter" in query_lower:
            return "Für aktuelle Wetterinformationen würde ich eine Wetter-API verwenden. Leider kann ich in der Entwicklungsumgebung keine echten Wetterdaten abrufen."
        elif "zeit" in query_lower or "uhr" in query_lower:
            return f"Die aktuelle Zeit ist: {asyncio.get_event_loop().time()}. Das ist eine Timestamp-basierte Antwort."
        else:
            return f"Basierend auf Ihrer Anfrage '{query_part}': Das ist eine interessante Frage. In einer vollständigen Umgebung würde ich verschiedene Tools verwenden, um Ihnen eine präzise Antwort zu geben. Für die Entwicklungsumgebung ist dies eine stubbed Antwort."

    async def check_connection(self) -> bool:
        return True

from agent.tool_engine import ToolRegistry

class Core:
    def __init__(self):
        # Setup logging depending on debug flag
        setup_logging(debug=config.debug)

        # Use real LLM handler by default (GPT-OSS:20B Ollama model)
        # Only use stub in test environment
        if config.env == "test":
            self.llm_handler = StubLLMHandler()
            self.stub_llm_handler = StubLLMHandler()
            logger.info("Using Stub LLM handler for test environment")
        else:
            self.llm_handler = LLMHandler()
            self.stub_llm_handler = StubLLMHandler()  # Keep stub as fallback
            logger.info("Using real LLM handler with GPT-OSS:20B Ollama model", env=config.env)

        self.tool_registry = ToolRegistry()
        self.agent_id = str(uuid.uuid4())

    async def _check_llm_connection(self):
        """Check if LLM server is available"""
        try:
            if hasattr(self.llm_handler, 'check_connection'):
                is_connected = await self.llm_handler.check_connection()
            else:
                is_connected = True
            if not is_connected:
                logger.warning("LLM server not available. Using fallback responses.")
            return is_connected
        except Exception as e:
            logger.error("Could not connect to LLM server", error=str(e))
            return False

    async def _get_llm_status(self):
        """Get detailed LLM connection status"""
        try:
            from agent.llm_engine.manager import llm_manager
            from agent.utils.config import config
            
            status = {
                "connected": False,
                "provider": "unknown",
                "base_url": config.llm_base_url,
                "model": config.llm_model,
                "available_models": [],
                "error": None
            }
            
            # Check if we can get a model from the manager
            try:
                available_models = llm_manager.list_available_models()
                if available_models:
                    # Try to get the first available model
                    model_key = available_models[0]
                    model = llm_manager.get(model_key)
                    if hasattr(model, 'provider') and hasattr(model.provider, 'check_server'):
                        is_connected = await model.provider.check_server()
                        status["connected"] = is_connected
                        status["provider"] = model_key.split(":")[0]
                        
                        if is_connected and hasattr(model.provider, 'list_models'):
                            try:
                                models = await model.provider.list_models()
                                if models:
                                    status["available_models"] = [m.get("name", m.get("id", "unknown")) for m in models]
                            except Exception as e:
                                logger.warning(f"Could not list models: {e}")
            except Exception as e:
                status["error"] = str(e)
                logger.error(f"Error checking LLM status: {e}")
            
            return status
        except Exception as e:
            logger.error(f"Error getting LLM status: {e}")
            return {"connected": False, "error": str(e)}

    async def ask(self, user_input: str):
        """Main entry point for user queries"""
        print(f"Processing query: {user_input}")
        
        try:
            # Check LLM connection first
            llm_connected = await self._check_llm_connection()
            
            if llm_connected:
                # Use the LLM handler to generate responses
                if hasattr(self.llm_handler, 'generate'):
                    try:
                        result = await self.llm_handler.generate(user_input)
                        print(f"Generated result: {result}")
                        return result
                    except Exception as e:
                        logger.error(f"LLM generation failed: {e}")
                        # Fallback to stub response
                        if hasattr(self, 'stub_llm_handler'):
                            result = await self.stub_llm_handler.generate(user_input)
                            return f"{result}\n\n[Hinweis: LLM-Provider nicht verfügbar, Fallback-Antwort verwendet]"
                        else:
                            return f"Basierend auf Ihrer Anfrage '{user_input}': Das ist eine interessante Frage. Der LLM-Provider ist momentan nicht verfügbar, aber ich kann trotzdem weiterarbeiten."
                else:
                    # Fallback wenn kein LLM Handler verfügbar
                    return f"Basierend auf Ihrer Anfrage '{user_input}': Das ist eine interessante Frage. In einer vollständigen Umgebung würde ich verschiedene Tools verwenden, um Ihnen eine präzise Antwort zu geben."
            else:
                # LLM nicht verfügbar, verwende Fallback
                if hasattr(self, 'stub_llm_handler'):
                    result = await self.stub_llm_handler.generate(user_input)
                    return f"{result}\n\n[Hinweis: LLM-Provider nicht verfügbar, Fallback-Antwort verwendet]"
                else:
                    return f"Basierend auf Ihrer Anfrage '{user_input}': Das ist eine interessante Frage. Der LLM-Provider ist momentan nicht verfügbar, aber ich kann trotzdem weiterarbeiten."
                
        except Exception as e:
            print(f"Error in ask method: {e}")
            logger.error(f"Error in ask method: {e}")
            # Fallback wenn das Reasoning fehlschlägt
            return f"Entschuldigung, ich konnte keine vollständige Antwort für '{user_input}' generieren. Das könnte an der Entwicklungsumgebung liegen."
                
    