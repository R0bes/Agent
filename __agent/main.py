# ageent/main.py - FastAPI Main Application
import asyncio
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any

import structlog
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import uvicorn

from core.agent_fsm import AgentFSM, TaskManager, AgentState, TaskStatus, AgentContext
from core.database import DatabaseManager
from llm.integration import LLMOrchestrator, LLMConfig, LLMProvider
from tools.suite import ToolRegistry, DatabaseTools, MemoryTools, FileTools, WebTools, CodeExecutionTools, SystemTools
from monitoring.metrics import MetricsCollector, PrometheusExporter
from monitoring.tracing import TracingMiddleware

logger = structlog.get_logger(__name__)

# Pydantic Models for API
class AgentCreateRequest(BaseModel):
    name: str = Field(..., description="Agent name")
    config: Dict[str, Any] = Field(default_factory=dict, description="Agent configuration")
    llm_provider: str = Field(default="ollama", description="LLM provider")
    model: str = Field(default="llama2", description="LLM model")

class AgentResponse(BaseModel):
    id: str
    name: str
    state: str
    config: Dict[str, Any]
    created_at: str
    last_activity: str

class TaskCreateRequest(BaseModel):
    agent_id: str = Field(..., description="Agent ID")
    name: str = Field(..., description="Task name")
    description: str = Field(default="", description="Task description")
    input_data: Dict[str, Any] = Field(default_factory=dict, description="Task input")
    priority: str = Field(default="normal", description="Task priority")

class TaskResponse(BaseModel):
    id: str
    agent_id: str
    name: str
    status: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    created_at: str

class ChatRequest(BaseModel):
    agent_id: str = Field(..., description="Agent ID")
    message: str = Field(..., description="User message")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")

class ChatResponse(BaseModel):
    response: str
    agent_state: str
    metadata: Dict[str, Any]

class SystemHealthResponse(BaseModel):
    status: str
    version: str
    uptime: float
    components: Dict[str, str]
    metrics: Dict[str, Any]

class MultiAgentManager:
    """Central Multi-Agent Management System"""
    
    def __init__(self):
        self.agents: Dict[uuid.UUID, AgentFSM] = {}
        self.task_manager: Optional[TaskManager] = None
        self.db_manager: Optional[DatabaseManager] = None
        self.llm_orchestrator: Optional[LLMOrchestrator] = None
        self.tool_registry: Optional[ToolRegistry] = None
        self.metrics_collector: Optional[MetricsCollector] = None
        self.websocket_connections: Dict[str, WebSocket] = {}
        self.start_time = datetime.utcnow()
        
    async def initialize(self):
        """Initialize all system components"""
        logger.info("Initializing Multi-Agent Framework...")
        
        # Initialize database
        self.db_manager = DatabaseManager()
        await self.db_manager.initialize()
        
        # Initialize task manager
        self.task_manager = TaskManager(self.db_manager.get_session())
        
        # Initialize LLM orchestrator
        llm_configs = self._get_llm_configs()
        self.llm_orchestrator = LLMOrchestrator(llm_configs)
        
        # Initialize tool registry
        self.tool_registry = ToolRegistry()
        await self._register_tools()
        
        # Initialize metrics
        self.metrics_collector = MetricsCollector()
        
        logger.info("Multi-Agent Framework initialized successfully")
    
    def _get_llm_configs(self) -> List[LLMConfig]:
        """Get LLM configurations from environment"""
        import os
        
        configs = []
        
        # Ollama (Local)
        ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        configs.append(LLMConfig(
            provider=LLMProviderType.OLLAMA,
            model="llama2",
            base_url=ollama_url,
            max_tokens=4096,
            temperature=0.7
        ))
        
        # OpenAI (if API key available)
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            configs.append(LLMConfig(
                provider=LLMProviderType.OPENAI,
                model="gpt-4",
                base_url="https://api.openai.com/v1",
                api_key=openai_key,
                max_tokens=4096,
                cost_per_1k_tokens=0.03
            ))
        
        # Anthropic (if API key available)
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            configs.append(LLMConfig(
                provider=LLMProviderType.ANTHROPIC,
                model="claude-3-sonnet-20240229",
                base_url="https://api.anthropic.com",
                api_key=anthropic_key,
                max_tokens=4096,
                cost_per_1k_tokens=0.015
            ))
        
        return configs
    
    async def _register_tools(self):
        """Register all available tools"""
        import os
        
        db_url = os.getenv("DATABASE_URL", "postgresql://agent_user:agent_password@localhost:5432/agent_db")
        
        # Database tools
        self.tool_registry.register_tool(
            "database",
            DatabaseTools,
            {"connection_string": db_url}
        )
        
        # Memory tools  
        chroma_path = os.getenv("CHROMA_PATH", "./data/chroma")
        self.tool_registry.register_tool(
            "memory",
            MemoryTools,
            {"chroma_path": chroma_path}
        )
        
        # File tools
        workspace_path = os.getenv("WORKSPACE_PATH", "./workspace")
        self.tool_registry.register_tool(
            "files",
            FileTools,
            {"base_path": workspace_path}
        )
        
        # Web tools
        self.tool_registry.register_tool(
            "web",
            WebTools,
            {"timeout": 30, "max_concurrent": 10}
        )
        
        # Code execution tools
        self.tool_registry.register_tool(
            "code",
            CodeExecutionTools,
            {"workspace_path": f"{workspace_path}/code"}
        )
        
        # System tools
        self.tool_registry.register_tool(
            "system",
            SystemTools,
            {}
        )
        
        logger.info("Tools registered", count=len(self.tool_registry.get_available_tools()))
    
    async def create_agent(self, request: AgentCreateRequest) -> uuid.UUID:
        """Create new agent instance"""
        agent_id = uuid.uuid4()
        
        # Create agent in database
        session = self.db_manager.get_session()
        async with session() as db:
            from core.agent_fsm import AgentModel
            
            agent = AgentModel(
                id=agent_id,
                name=request.name,
                config=request.config,
                state=AgentState.IDLE
            )
            db.add(agent)
            await db.commit()
        
        # Create FSM instance
        agent_fsm = AgentFSM(agent_id, session())
        self.agents[agent_id] = agent_fsm
        
        # Initialize metrics for agent
        self.metrics_collector.register_agent(agent_id, request.name)
        
        logger.info("Agent created", agent_id=agent_id, name=request.name)
        return agent_id
    
    async def execute_agent_workflow(self, 
                                   agent_id: uuid.UUID,
                                   task_description: str,
                                   context: AgentContext) -> Dict[str, Any]:
        """Execute complete agent workflow through FSM states"""
        
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")
        
        agent_fsm = self.agents[agent_id]
        start_time = datetime.utcnow()
        
        try:
            # ANALYSIS STATE
            await agent_fsm.transition_to(AgentState.ANALYSIS, {"task": task_description})
            analysis_result = await self._execute_analysis(agent_id, task_description, context)
            
            # PLANNING STATE
            await agent_fsm.transition_to(AgentState.PLANNING, {"analysis": analysis_result})
            plan_result = await self._execute_planning(agent_id, analysis_result, context)
            
            # EXECUTION STATE
            await agent_fsm.transition_to(AgentState.EXECUTION, {"plan": plan_result})
            execution_result = await self._execute_tasks(agent_id, plan_result, context)
            
            # EVALUATION STATE
            await agent_fsm.transition_to(AgentState.EVALUATION, {"execution": execution_result})
            evaluation_result = await self._execute_evaluation(agent_id, execution_result, context)
            
            # FINALIZE STATE
            await agent_fsm.transition_to(AgentState.FINALIZE, {"evaluation": evaluation_result})
            final_result = await self._finalize_workflow(agent_id, evaluation_result, context)
            
            await agent_fsm.transition_to(AgentState.COMPLETED)
            
            # Record metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_collector.record_workflow_completion(agent_id, execution_time, True)
            
            return {
                "success": True,
                "result": final_result,
                "execution_time": execution_time,
                "states_traversed": len(agent_fsm.state_history)
            }
            
        except Exception as e:
            await agent_fsm.transition_to(AgentState.ERROR, {"error": str(e)})
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics_collector.record_workflow_completion(agent_id, execution_time, False)
            
            logger.error("Workflow execution failed", agent_id=agent_id, error=str(e))
            raise
    
    async def _execute_analysis(self, 
                               agent_id: uuid.UUID, 
                               task: str, 
                               context: AgentContext) -> Dict[str, Any]:
        """Execute analysis phase using LLM"""
        
        response = await self.llm_orchestrator.generate(
            [{"role": "user", "content": evaluation_prompt}]
        )
        
        return {
            "success_rate": success_rate,
            "evaluation": response.content,
            "quality_score": min(success_rate * 100, 95),  # Cap at 95%
            "recommendations": ["Improve error handling", "Add more validation"]
        }
    
    async def _finalize_workflow(self,
                                agent_id: uuid.UUID,
                                evaluation: Dict[str, Any],
                                context: AgentContext) -> Dict[str, Any]:
        """Finalize workflow and prepare results"""
        
        # Store results in memory for future reference
        memory_tool = await self.tool_registry.get_tool("memory")
        await memory_tool.remember(
            key=f"workflow_result_{datetime.utcnow().isoformat()}",
            value=evaluation,
            importance=8,
            tags=["workflow", "completion", str(agent_id)]
        )
        
        return {
            "final_result": evaluation["evaluation"],
            "quality_score": evaluation["quality_score"],
            "success_rate": evaluation["success_rate"],
            "completion_time": datetime.utcnow().isoformat()
        }
    
    async def _broadcast_task_update(self, agent_id: uuid.UUID, task_name: str, result: Any):
        """Broadcast task update via WebSocket"""
        message = {
            "type": "task_update",
            "agent_id": str(agent_id),
            "task_name": task_name,
            "status": "completed" if result.success else "failed",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        connection_key = str(agent_id)
        if connection_key in self.websocket_connections:
            try:
                await self.websocket_connections[connection_key].send_json(message)
            except:
                # Remove dead connection
                del self.websocket_connections[connection_key]
    
    async def get_system_health(self) -> SystemHealthResponse:
        """Get comprehensive system health status"""
        
        components = {}
        
        # Check database
        try:
            await self.db_manager.health_check()
            components["database"] = "healthy"
        except:
            components["database"] = "unhealthy"
        
        # Check LLM orchestrator
        try:
            llm_health = await self.llm_orchestrator.health_check()
            components["llm"] = "healthy" if llm_health["healthy_providers"] > 0 else "unhealthy"
        except:
            components["llm"] = "unhealthy"
        
        # Check tools
        try:
            tool_count = len(self.tool_registry.get_available_tools())
            components["tools"] = "healthy" if tool_count > 0 else "unhealthy"
        except:
            components["tools"] = "unhealthy"
        
        # Get system metrics
        system_tool = await self.tool_registry.get_tool("system")
        metrics_result = await system_tool.get_system_metrics()
        
        overall_status = "healthy" if all(status == "healthy" for status in components.values()) else "degraded"
        uptime = (datetime.utcnow() - self.start_time).total_seconds()
        
        return SystemHealthResponse(
            status=overall_status,
            version="1.0.0",
            uptime=uptime,
            components=components,
            metrics=metrics_result.data if metrics_result.success else {}
        )

# Global manager instance
manager = MultiAgentManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    await manager.initialize()
    logger.info("Agent Framework started successfully")
    
    yield
    
    # Shutdown
    logger.info("Agent Framework shutting down...")
    if manager.db_manager:
        await manager.db_manager.close()

# FastAPI Application
app = FastAPI(
    title="Multi-Agent Framework",
    description="Multi-Agent System with FSM and LLM Integration",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TracingMiddleware)

# API Routes
@app.get("/health", response_model=SystemHealthResponse)
async def health_check():
    """System health check endpoint"""
    return await manager.get_system_health()

@app.post("/agents", response_model=Dict[str, str])
async def create_agent(request: AgentCreateRequest):
    """Create new agent"""
    try:
        agent_id = await manager.create_agent(request)
        return {"agent_id": str(agent_id), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents", response_model=List[AgentResponse])
async def list_agents():
    """List all agents"""
    try:
        session = manager.db_manager.get_session()
        async with session() as db:
            from core.agent_fsm import AgentModel
            from sqlalchemy import select
            
            result = await db.execute(select(AgentModel))
            agents = result.scalars().all()
            
            return [
                AgentResponse(
                    id=str(agent.id),
                    name=agent.name,
                    state=agent.state,
                    config=agent.config,
                    created_at=agent.created_at.isoformat(),
                    last_activity=agent.last_activity.isoformat()
                )
                for agent in agents
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get specific agent details"""
    try:
        session = manager.db_manager.get_session()
        async with session() as db:
            from core.agent_fsm import AgentModel
            
            agent = await db.get(AgentModel, uuid.UUID(agent_id))
            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")
            
            return AgentResponse(
                id=str(agent.id),
                name=agent.name,
                state=agent.state,
                config=agent.config,
                created_at=agent.created_at.isoformat(),
                last_activity=agent.last_activity.isoformat()
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(agent_id: str, request: ChatRequest):
    """Chat with agent (simplified workflow execution)"""
    try:
        agent_uuid = uuid.UUID(agent_id)
        context = AgentContext(
            agent_id=agent_uuid,
            metadata=request.context
        )
        
        result = await manager.execute_agent_workflow(
            agent_uuid,
            request.message,
            context
        )
        
        return ChatResponse(
            response=result["result"]["final_result"],
            agent_state="completed",
            metadata={
                "execution_time": result["execution_time"],
                "quality_score": result["result"]["quality_score"]
            }
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tasks", response_model=Dict[str, str])
async def create_task(request: TaskCreateRequest):
    """Create new task"""
    try:
        task_id = await manager.task_manager.create_task(
            agent_id=uuid.UUID(request.agent_id),
            name=request.name,
            description=request.description,
            input_data=request.input_data
        )
        return {"task_id": str(task_id), "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks", response_model=List[TaskResponse])
async def list_tasks(agent_id: Optional[str] = None, status: Optional[str] = None):
    """List tasks with optional filters"""
    try:
        session = manager.db_manager.get_session()
        async with session() as db:
            from core.agent_fsm import TaskModel
            from sqlalchemy import select
            
            query = select(TaskModel)
            
            if agent_id:
                query = query.where(TaskModel.agent_id == uuid.UUID(agent_id))
            if status:
                query = query.where(TaskModel.status == status)
            
            result = await db.execute(query.limit(100))  # Limit results
            tasks = result.scalars().all()
            
            return [
                TaskResponse(
                    id=str(task.id),
                    agent_id=str(task.agent_id),
                    name=task.name,
                    status=task.status,
                    input_data=task.input_data,
                    output_data=task.output_data,
                    created_at=task.created_at.isoformat()
                )
                for task in tasks
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    try:
        # This would return Prometheus format metrics
        metrics_data = manager.metrics_collector.get_all_metrics()
        
        # Convert to Prometheus format (simplified)
        prometheus_metrics = []
        for metric_name, metric_value in metrics_data.items():
            prometheus_metrics.append(f"{metric_name} {metric_value}")
        
        return "\n".join(prometheus_metrics)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tools")
async def list_tools():
    """List available tools"""
    try:
        tools = manager.tool_registry.get_available_tools()
        usage_stats = manager.tool_registry.get_usage_stats()
        
        return {
            "available_tools": tools,
            "usage_statistics": usage_stats,
            "total_tools": len(tools)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time updates
@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    """WebSocket connection for real-time agent updates"""
    await websocket.accept()
    
    # Store connection
    manager.websocket_connections[agent_id] = websocket
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Echo back for now - could handle commands
            await websocket.send_json({
                "type": "ack",
                "message": f"Received: {data}",
                "timestamp": datetime.now()
            })
            
    except WebSocketDisconnect:
        # Clean up connection
        if agent_id in manager.websocket_connections:
            del manager.websocket_connections[agent_id]
        logger.info("WebSocket disconnected", agent_id=agent_id)

# Background task for periodic health checks
@app.on_event("startup")
async def startup_tasks():
    """Background startup tasks"""
    
    async def periodic_health_check():
        """Periodic system health monitoring"""
        while True:
            try:
                await asyncio.sleep(60)  # Every minute
                health = await manager.get_system_health()
                
                if health.status != "healthy":
                    logger.warning("System health degraded", 
                                 status=health.status,
                                 components=health.components)
                
                # Record metrics
                manager.metrics_collector.record_health_check(health.status == "healthy")
                
            except Exception as e:
                logger.error("Health check failed", error=str(e))
    
    # Start background task
    asyncio.create_task(periodic_health_check())
    
if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "default": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
            },
            "root": {
                "level": "INFO",
                "handlers": ["default"],
            },
            "loggers": {
                "uvicorn": {"level": "INFO"},
                "uvicorn.error": {"level": "INFO"},
                "uvicorn.access": {"level": "INFO"},
            },
        }
    )
    async def _execute_analysis(self, 
                               agent_id: uuid.UUID, 
                               task: str, 
                               context: AgentContext) -> Dict[str, Any]:
        """Execute analysis phase using LLM"""

        response = await self.llm_orchestrator.generate_with_template(
            "analysis",
            {
                "task_description": task,
                "context": context.metadata,
                "data": "Available tools: " + ", ".join(self.tool_registry.get_available_tools())
            }
        )

        return {
            "analysis": response.content,
            "complexity": "medium",  # Could be extracted from response
            "estimated_time": 300,   # Could be extracted from response
            "required_tools": self.tool_registry.get_available_tools()[:3]  # Simplified
        }

    async def _execute_planning(self,
                               agent_id: uuid.UUID,
                               analysis: Dict[str, Any],
                               context: AgentContext) -> Dict[str, Any]:
        """Execute planning phase using LLM"""
        
        response = await self.llm_orchestrator.generate_with_template(
            "planning",
            {
                "objective": analysis["analysis"],
                "resources": analysis["required_tools"],
                "constraints": f"Max execution time: {analysis['estimated_time']}s"
            }
        )
        
        # Parse plan into actionable steps (simplified)
        steps = [
            {"name": "data_gathering", "tool": "web", "params": {"query": "relevant information"}},
            {"name": "processing", "tool": "code", "params": {"language": "python"}},
            {"name": "storage", "tool": "memory", "params": {"key": "result"}}
        ]
        
        return {
            "plan": response.content,
            "steps": steps,
            "estimated_duration": analysis["estimated_time"],
            "parallel_tasks": []
        }
    
    async def _execute_tasks(self,
                           agent_id: uuid.UUID,
                           plan: Dict[str, Any],
                           context: AgentContext) -> Dict[str, Any]:
        """Execute planned tasks using TaskManager"""
        
        results = []
        
        for step in plan["steps"]:
            # Create task
            task_id = await self.task_manager.create_task(
                agent_id=agent_id,
                name=step["name"],
                description=f"Execute {step['tool']} with {step['params']}",
                input_data=step["params"]
            )
            
            # Execute task
            tool = await self.tool_registry.get_tool(step["tool"])
            
            async def task_executor(input_data, ctx):
                # This would call the appropriate tool method
                # For now, return mock result
                return {"status": "completed", "data": f"Executed {step['tool']}"}
            
            result = await self.task_manager.execute_task(task_id, task_executor, context)
            results.append(result)
            
            # Notify via WebSocket if connected
            if str(agent_id) in self.websocket_connections:
                await self._broadcast_task_update(agent_id, step["name"], result)
        
        return {
            "task_results": results,
            "success_count": sum(1 for r in results if r.success),
            "total_tasks": len(results)
        }
    
    async def _execute_evaluation(self,
                                 agent_id: uuid.UUID,
                                 execution: Dict[str, Any],
                                 context: AgentContext) -> Dict[str, Any]:
        """Evaluate execution results"""
        
        success_rate = execution["success_count"] / execution["total_tasks"]
        
        # Use LLM to evaluate quality
        evaluation_prompt = f"""
        Task execution completed with {execution['success_count']}/{execution['total_tasks']} successful tasks.
        Results: {execution['task_results']}
        
        Evaluate the overall success and quality of the execution.
        Provide recommendations for improvement.
        """
        
        response = await self.llm_orchestrator.generate(
            [{"role": "user", "content": evaluation_prompt}]
        )