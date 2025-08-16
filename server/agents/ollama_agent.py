"""
Konkrete Implementierung eines Ollama-Local Agenten.
Verwendet die abstrakte BaseAgent-Klasse als Grundlage.
"""

import asyncio
from typing import Dict, Any, Optional, List, Callable, AsyncGenerator
from datetime import datetime
import json
import aiohttp

from .base_agent import BaseAgent, AgentConfig, AgentResponse, StreamChunk, AgentError


class OllamaConfig(AgentConfig):
    """Spezielle Konfiguration für Ollama-Agenten."""

    base_url: str = "http://host.docker.internal:11434"  # WSL -> Windows Host
    stream: bool = False
    format: Optional[str] = None
    options: Optional[Dict[str, Any]] = None


class OllamaAgent(BaseAgent):
    """
    Konkrete Implementierung eines Ollama-Local Agenten.

    Diese Klasse implementiert die abstrakte BaseAgent-Klasse und
    kommuniziert mit einem lokalen Ollama-Server über HTTP.
    """

    def __init__(self, config: OllamaConfig):
        """
        Initialisiert den Ollama-Agenten.

        Args:
            config: Ollama-spezifische Konfiguration
        """
        super().__init__(config)
        self.base_url = config.base_url
        self.stream = config.stream
        self.format = config.format
        self.options = config.options or {}
        self.session: Optional[aiohttp.ClientSession] = None

    async def initialize(self) -> bool:
        """
        Initialisiert den Ollama-Agenten und testet die Verbindung.

        Returns:
            True wenn erfolgreich initialisiert, False sonst
        """
        try:
            # HTTP-Session erstellen
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            )

            # Verbindung zum Ollama-Server testen
            health_status = await self.health_check()
            if health_status.get("status") == "healthy":
                self.is_initialized = True
                self.logger.info(f"Ollama-Agent {self.name} erfolgreich initialisiert")
                return True
            else:
                self.logger.error(f"Ollama-Server nicht erreichbar: {health_status}")
                return False

        except Exception as e:
            self.logger.error(f"Fehler bei der Initialisierung des Ollama-Agenten: {e}")
            return False

    async def generate_response(
        self, prompt: str, context: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> AgentResponse:
        """
        Generiert eine Antwort über den Ollama-Server.

        Args:
            prompt: Der Eingabe-Prompt
            context: Optionaler Kontext als Liste von Nachrichten
            **kwargs: Zusätzliche Parameter

        Returns:
            AgentResponse mit der generierten Antwort

        Raises:
            AgentError: Bei Fehlern während der Generierung
        """
        if not self.is_initialized:
            raise AgentError("Agent nicht initialisiert", self.name)

        try:
            # Ollama-Parameter vorbereiten
            generate_params = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,  # Kein Streaming für normale Antworten
                "options": {
                    "temperature": kwargs.get("temperature", self.config.temperature),
                    "top_p": kwargs.get("top_p", 0.9),
                    "top_k": kwargs.get("top_k", 40),
                    "repeat_penalty": kwargs.get("repeat_penalty", 1.1),
                },
            }

            # Max-Tokens hinzufügen wenn gesetzt
            if self.config.max_tokens:
                generate_params["options"]["num_predict"] = self.config.max_tokens

            # System-Prompt hinzufügen wenn gesetzt
            if self.config.system_prompt:
                generate_params["system"] = self.config.system_prompt

            # Format hinzufügen wenn gesetzt
            if self.format:
                generate_params["format"] = self.format

            # Zusätzliche Optionen hinzufügen
            if self.options:
                generate_params["options"].update(self.options)

            # Kontext als Nachrichten hinzufügen wenn vorhanden
            if context:
                messages = []
                for msg in context:
                    if "role" in msg and "content" in msg:
                        messages.append({"role": msg["role"], "content": msg["content"]})

                if messages:
                    generate_params["messages"] = messages

            # HTTP-API an Ollama aufrufen
            async with self.session.post(
                f"{self.base_url}/api/generate",
                json=generate_params,
                headers={"Content-Type": "application/json"},
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise AgentError(
                        f"Ollama API Fehler: {response.status} - {error_text}", self.name
                    )

                response_data = await response.json()

            # Antwort verarbeiten
            content = response_data.get("response", "")
            usage = {
                "prompt_tokens": response_data.get("prompt_eval_count", 0),
                "completion_tokens": response_data.get("eval_count", 0),
                "total_tokens": response_data.get("prompt_eval_count", 0)
                + response_data.get("eval_count", 0),
            }

            return AgentResponse(
                content=content,
                model=self.model,
                usage=usage,
                finish_reason="stop" if response_data.get("done", True) else "length",
                timestamp=datetime.now(),
            )

        except Exception as e:
            raise AgentError(f"Fehler bei der Antwortgenerierung: {e}", self.name, e)

    async def generate_response_stream(
        self,
        prompt: str,
        context: Optional[List[Dict[str, str]]] = None,
        on_chunk: Optional[Callable[[StreamChunk], None]] = None,
        **kwargs,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Generiert eine gestreamte Antwort über den Ollama-Server.

        Args:
            prompt: Der Eingabe-Prompt
            context: Optionaler Kontext als Liste von Nachrichten
            on_chunk: Optionaler Callback für jeden Chunk
            **kwargs: Zusätzliche Parameter

        Yields:
            StreamChunk für jeden Token

        Raises:
            AgentError: Bei Fehlern während der Generierung
        """
        if not self.is_initialized:
            raise AgentError("Agent nicht initialisiert", self.name)

        try:
            # Ollama-Parameter vorbereiten
            generate_params = {
                "model": self.model,
                "prompt": prompt,
                "stream": True,  # Streaming aktivieren
                "options": {
                    "temperature": kwargs.get("temperature", self.config.temperature),
                    "top_p": kwargs.get("top_p", 0.9),
                    "top_k": kwargs.get("top_k", 40),
                    "repeat_penalty": kwargs.get("repeat_penalty", 1.1),
                },
            }

            # Max-Tokens hinzufügen wenn gesetzt
            if self.config.max_tokens:
                generate_params["options"]["num_predict"] = self.config.max_tokens

            # System-Prompt hinzufügen wenn gesetzt
            if self.config.system_prompt:
                generate_params["system"] = self.config.system_prompt

            # Format hinzufügen wenn gesetzt
            if self.format:
                generate_params["format"] = self.format

            # Zusätzliche Optionen hinzufügen
            if self.options:
                generate_params["options"].update(self.options)

            # Kontext als Nachrichten hinzufügen wenn vorhanden
            if context:
                messages = []
                for msg in context:
                    if "role" in msg and "content" in msg:
                        messages.append({"role": msg["role"], "content": msg["content"]})

                if messages:
                    generate_params["messages"] = messages

            # HTTP-API an Ollama mit Streaming aufrufen
            async with self.session.post(
                f"{self.base_url}/api/generate",
                json=generate_params,
                headers={"Content-Type": "application/json"},
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise AgentError(
                        f"Ollama API Fehler: {response.status} - {error_text}", self.name
                    )

                # Stream verarbeiten
                async for line in response.content:
                    if not line.strip():
                        continue

                    try:
                        # JSON-Parsing für jeden Chunk
                        chunk_data = json.loads(line.decode("utf-8"))

                        # StreamChunk erstellen
                        content = chunk_data.get("response", "")
                        done = chunk_data.get("done", False)

                        usage = None
                        if "prompt_eval_count" in chunk_data or "eval_count" in chunk_data:
                            usage = {
                                "prompt_tokens": chunk_data.get("prompt_eval_count", 0),
                                "completion_tokens": chunk_data.get("eval_count", 0),
                                "total_tokens": chunk_data.get("prompt_eval_count", 0)
                                + chunk_data.get("eval_count", 0),
                            }

                        chunk = StreamChunk(
                            content=content, done=done, model=self.model, usage=usage
                        )

                        # Chunk an Callback senden wenn vorhanden
                        if on_chunk:
                            on_chunk(chunk)

                        # Chunk auch als Generator zurückgeben
                        yield chunk

                        # Bei done=True abbrechen
                        if done:
                            break

                    except json.JSONDecodeError as e:
                        self.logger.warning(f"JSON-Parsing-Fehler für Chunk: {e}")
                        continue
                    except Exception as e:
                        self.logger.error(f"Fehler bei der Chunk-Verarbeitung: {e}")
                        continue

        except Exception as e:
            raise AgentError(f"Fehler beim Streaming: {e}", self.name, e)

    async def health_check(self) -> Dict[str, Any]:
        """
        Führt einen Gesundheitscheck des Ollama-Servers durch.

        Returns:
            Dictionary mit Gesundheitsstatus-Informationen
        """
        try:
            if not self.session:
                return {
                    "status": "unhealthy",
                    "error": "Keine HTTP-Session verfügbar",
                    "timestamp": datetime.now().isoformat(),
                }

            # Ollama-Status abfragen
            async with self.session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "status": "healthy",
                        "server": "ollama",
                        "available_models": len(data.get("models", [])),
                        "timestamp": datetime.now().isoformat(),
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "error": f"HTTP {response.status}",
                        "timestamp": datetime.now().isoformat(),
                    }

        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "timestamp": datetime.now().isoformat()}

    async def list_models(self) -> List[Dict[str, Any]]:
        """
        Listet alle verfügbaren Modelle auf dem Ollama-Server auf.

        Returns:
            Liste der verfügbaren Modelle
        """
        if not self.is_initialized:
            raise AgentError("Agent nicht initialisiert", self.name)

        try:
            async with self.session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("models", [])
                else:
                    raise AgentError(
                        f"Fehler beim Abrufen der Modelle: {response.status}", self.name
                    )

        except Exception as e:
            raise AgentError(f"Fehler beim Abrufen der Modelle: {e}", self.name, e)

    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """
        Lädt ein Modell auf den Ollama-Server herunter.

        Args:
            model_name: Name des zu ladenden Modells

        Returns:
            Status des Downloads
        """
        if not self.is_initialized:
            raise AgentError("Agent nicht initialisiert", self.name)

        try:
            async with self.session.post(
                f"{self.base_url}/api/pull", json={"name": model_name}
            ) as response:
                if response.status == 200:
                    return {"status": "success", "model": model_name}
                else:
                    error_text = await response.text()
                    raise AgentError(f"Fehler beim Laden des Modells: {error_text}", self.name)

        except Exception as e:
            raise AgentError(f"Fehler beim Laden des Modells: {e}", self.name, e)

    async def cleanup(self) -> None:
        """
        Bereinigt Ressourcen und schließt die HTTP-Session.
        """
        if self.session:
            await self.session.close()
            self.session = None

        await super().cleanup()

    def __del__(self):
        """Destruktor für die Bereinigung der Session."""
        if self.session and not self.session.closed:
            asyncio.create_task(self.session.close())
