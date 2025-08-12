from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from datetime import datetime
from agent.core import Core
from agent.utils.log import get_logger

# Configure logging
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Agent API",
    description="A FastAPI wrapper for the reasoning agent",
    version="1.0.0"
)

# Initialize the agent core
agent_core = Core()

# Pydantic models for request/response
class ThinkRequest(BaseModel):
    query: str
    agent_id: Optional[str] = None
    max_iterations: Optional[int] = 10
    allow_subtasks: Optional[bool] = True
    max_subtask_depth: Optional[int] = 3

class ThinkResponse(BaseModel):
    result: str
    agent_id: str
    query: str
    status: str = "completed"
    metadata: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    agent_id: str
    llm_connected: bool
    tools_available: int
    llm_providers: Dict[str, Any] = {}

    class Config:
        extra = "allow"

class LLMProviderStatus(BaseModel):
    provider: str
    base_url: str
    model: str
    connected: bool
    available_models: List[str]
    error_message: Optional[str] = None

class LLMStatusResponse(BaseModel):
    agent_id: str
    providers: List[LLMProviderStatus]
    default_provider: str
    default_model: str

class LogEntry(BaseModel):
    id: str
    timestamp: str
    level: str
    message: str
    source: str
    metadata: Optional[Dict[str, Any]] = None

class LogsResponse(BaseModel):
    logs: List[LogEntry]
    total: int
    filtered: int

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check LLM connection
        llm_connected = await agent_core._check_llm_connection()
        
        # Count available tools
        tools_available = len(agent_core.tool_registry.tools)
        
        # Get detailed LLM provider information
        from agent.llm_engine.manager import llm_manager
        from agent.utils.config import config
        
        llm_providers = {}
        
        # Check configured providers
        base_url = config.llm_base_url
        model_name = config.llm_model
        provider_type = config.llm_provider
        
        # Auto-detect provider if set to auto
        if provider_type == "auto":
            if "localhost:1234" in base_url or "127.0.0.1:1234" in base_url:
                provider_type = "lmstudio"
            elif "localhost:11434" in base_url or "127.0.0.1:11434" in base_url:
                provider_type = "ollama"
            else:
                provider_type = "ollama"
        
        # Check Ollama provider
        try:
            from agent.llm_engine.providers.ollama_provider import OllamaProvider
            ollama_provider = OllamaProvider(base_url)
            ollama_connected = await ollama_provider.check_server()
            ollama_models = await ollama_provider.list_models() if ollama_connected else []
            
            llm_providers["ollama"] = {
                "provider": "ollama",
                "base_url": base_url,
                "model": model_name if provider_type == "ollama" else "not_configured",
                "connected": ollama_connected,
                "available_models": [m.get("name", "unknown") for m in ollama_models],
                "error_message": None if ollama_connected else "Server not reachable"
            }
        except Exception as e:
            llm_providers["ollama"] = {
                "provider": "ollama",
                "base_url": base_url,
                "model": "error",
                "connected": False,
                "available_models": [],
                "error_message": str(e)
            }
        
        # Check LM Studio provider
        try:
            from agent.llm_engine.providers.lm_studio_provider import LMStudioProvider
            lmstudio_provider = LMStudioProvider(base_url)
            lmstudio_connected = await lmstudio_provider.check_server()
            lmstudio_models = await lmstudio_provider.list_models() if lmstudio_connected else []
            
            llm_providers["lmstudio"] = {
                "provider": "lmstudio",
                "base_url": base_url,
                "model": model_name if provider_type == "lmstudio" else "not_configured",
                "connected": lmstudio_connected,
                "available_models": [m.get("id", "unknown") for m in lmstudio_models],
                "error_message": None if lmstudio_connected else "Server not reachable"
            }
        except Exception as e:
            llm_providers["lmstudio"] = {
                "provider": "lmstudio",
                "base_url": base_url,
                "model": "error",
                "connected": False,
                "available_models": [],
                "error_message": str(e)
            }
        
        # Add configuration info
        llm_providers["config"] = {
            "default_provider": provider_type,
            "default_model": model_name,
            "base_url": base_url
        }
        
        return {
            "status": "healthy",
            "agent_id": agent_core.agent_id,
            "llm_connected": llm_connected,
            "tools_available": tools_available,
            "llm_providers": llm_providers
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.get("/logs", response_model=LogsResponse)
async def get_logs(
    level: Optional[str] = None,
    source: Optional[str] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
):
    """Get logs from the agent system"""
    try:
        logs = []
        log_files = ["logs/app.log", "logs/error.log"]
        
        for log_file in log_files:
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        if line.strip():
                            try:
                                # Parse log line (simple format: timestamp level name: message)
                                parts = line.strip().split(' ', 2)
                                if len(parts) >= 3:
                                    timestamp_str = f"{parts[0]} {parts[1]}"
                                    remaining = parts[2]
                                    
                                    # Extract level and message
                                    if ':' in remaining:
                                        level_name, message = remaining.split(':', 1)
                                        level_parts = level_name.split()
                                        if len(level_parts) >= 2:
                                            level = level_parts[-1]
                                            source_name = ' '.join(level_parts[:-1])
                                        else:
                                            level = 'INFO'
                                            source_name = level_name
                                    else:
                                        level = 'INFO'
                                        source_name = 'unknown'
                                        message = remaining
                                    
                                    # Apply filters
                                    if level and level.upper() != level.upper():
                                        continue
                                    if source and source_name.lower() != source.lower():
                                        continue
                                    
                                    log_entry = LogEntry(
                                        id=f"{log_file}_{line_num}",
                                        timestamp=timestamp_str,
                                        level=level.upper(),
                                        message=message.strip(),
                                        source=source_name,
                                        metadata={"file": log_file, "line": line_num}
                                    )
                                    logs.append(log_entry)
                            except Exception as e:
                                # Skip malformed lines
                                continue
        
        # Sort by timestamp (newest first)
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        total = len(logs)
        logs = logs[offset:offset + limit]
        
        return LogsResponse(
            logs=logs,
            total=total,
            filtered=len(logs)
        )
        
    except Exception as e:
        logger.error("Failed to get logs", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")

@app.post("/think", response_model=ThinkResponse)
async def think(request: ThinkRequest):
    """Main thinking endpoint that processes user queries"""
    try:
        logger.info("Processing think request", query=request.query, agent_id=agent_core.agent_id)
        
        # Process the query using the agent core
        result = await agent_core.ask(request.query)
        
        logger.info("Think request completed", query=request.query, result_length=len(str(result)))
        
        return ThinkResponse(
            result=str(result),
            agent_id=agent_core.agent_id,
            query=request.query,
            status="completed"
        )
        
    except Exception as e:
        logger.error("Think request failed", error=str(e), query=request.query)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# LLM status endpoint removed - information now available via /health endpoint

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Agent API is running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "think": "/think",
            "logs": "/logs"
        },
        "agent_id": agent_core.agent_id
    }


