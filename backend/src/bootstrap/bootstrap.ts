/**
 * Application Bootstrap
 * 
 * Initializes the application with all dependencies
 */

import { container } from "./container";
import { PostgresMessageRepository } from "../adapters/output/persistence/postgres/PostgresMessageRepository";
import { PostgresConversationRepository } from "../adapters/output/persistence/postgres/PostgresConversationRepository";
import { QdrantMemoryRepository } from "../adapters/output/persistence/qdrant/QdrantMemoryRepository";
import { RedisTaskRepository } from "../adapters/output/persistence/redis/RedisTaskRepository";
import { OllamaLLMProvider } from "../adapters/output/llm/OllamaLLMProvider";
import { OllamaEmbeddingProvider } from "../adapters/output/llm/OllamaEmbeddingProvider";
import { NatsEventPublisher } from "../adapters/output/messaging/NatsEventPublisher";
import { NatsEventSubscriber } from "../adapters/output/messaging/NatsEventSubscriber";
import { ThreadedChatPortAdapter } from "../adapters/input/ThreadedChatPortAdapter";
import { ThreadedMemoryPortAdapter } from "../adapters/input/ThreadedMemoryPortAdapter";
import { ThreadedToolPortAdapter } from "../adapters/input/ThreadedToolPortAdapter";
import { ThreadedSchedulerPortAdapter } from "../adapters/input/ThreadedSchedulerPortAdapter";
import { ProcessMessageUseCase } from "../application/useCases/chat/ProcessMessageUseCase";
import { GetConversationUseCase } from "../application/useCases/chat/GetConversationUseCase";
import { SearchMemoriesUseCase } from "../application/useCases/memory/SearchMemoriesUseCase";
import { CreateMemoryUseCase } from "../application/useCases/memory/CreateMemoryUseCase";
import { GetMemoryUseCase } from "../application/useCases/memory/GetMemoryUseCase";
import { ListMemoriesUseCase } from "../application/useCases/memory/ListMemoriesUseCase";
import { UpdateMemoryUseCase } from "../application/useCases/memory/UpdateMemoryUseCase";
import { DeleteMemoryUseCase } from "../application/useCases/memory/DeleteMemoryUseCase";
import { ExecuteToolUseCase } from "../application/useCases/tools/ExecuteToolUseCase";
import { ListToolsUseCase } from "../application/useCases/tools/ListToolsUseCase";
import { CreateTaskUseCase } from "../application/useCases/scheduler/CreateTaskUseCase";
import { ExecuteTaskUseCase } from "../application/useCases/scheduler/ExecuteTaskUseCase";
import { GetTaskUseCase } from "../application/useCases/scheduler/GetTaskUseCase";
import { ListTasksUseCase } from "../application/useCases/scheduler/ListTasksUseCase";
import { UpdateTaskUseCase } from "../application/useCases/scheduler/UpdateTaskUseCase";
import { DeleteTaskUseCase } from "../application/useCases/scheduler/DeleteTaskUseCase";
import { SetTaskEnabledUseCase } from "../application/useCases/scheduler/SetTaskEnabledUseCase";
import { logInfo, logError } from "../infrastructure/logging/logger";

/**
 * Bootstrap the application
 */
export async function bootstrap(): Promise<void> {
  logInfo("Bootstrap: Initializing application");

  // Initialize infrastructure connections
  const { createPostgresPool } = await import("../infrastructure/database/postgres/connection");
  const { runMigrations } = await import("../infrastructure/database/postgres/migrations");
  const { qdrantClient } = await import("../infrastructure/database/qdrant/connection");
  const { eventBus } = await import("../infrastructure/messaging/nats/connection");
  const { embeddingProvider: infrastructureEmbeddingProvider } = await import("../infrastructure/llm/embeddingProvider");

  // Initialize database
  const pool = await createPostgresPool();
  await runMigrations(pool);

  // Initialize Qdrant
  try {
    const dimension = await infrastructureEmbeddingProvider.getDimension();
    await qdrantClient.initialize(dimension);
    logInfo("Bootstrap: Qdrant initialized");
  } catch (err) {
    logInfo("Bootstrap: Qdrant initialization failed - continuing without Qdrant");
  }

  // Connect to NATS (optional - bootstrap can continue without it)
  try {
    await eventBus.connect();
    logInfo("Bootstrap: NATS connected");
  } catch (err) {
    logInfo("Bootstrap: NATS connection failed - continuing without NATS");
  }

  // Register repositories
  container.register("IMessageRepository", new PostgresMessageRepository());
  container.register("IConversationRepository", new PostgresConversationRepository());
  container.register("IMemoryRepository", new QdrantMemoryRepository());
  container.register("ITaskRepository", new RedisTaskRepository());

  // Register providers
  const llmProvider = new OllamaLLMProvider();
  const embeddingProvider = new OllamaEmbeddingProvider();
  const eventPublisher = new NatsEventPublisher();
  const eventSubscriber = new NatsEventSubscriber();
  
  container.register("ILLMProvider", llmProvider);
  container.register("IEmbeddingProvider", embeddingProvider);
  container.register("IEventPublisher", eventPublisher);
  container.register("IEventSubscriber", eventSubscriber);

  // Register port adapters
  const chatPort = new ThreadedChatPortAdapter();
  const memoryPort = new ThreadedMemoryPortAdapter();
  const toolPort = new ThreadedToolPortAdapter();
  const schedulerPort = new ThreadedSchedulerPortAdapter();
  
  container.register("IChatPort", chatPort);
  container.register("IMemoryPort", memoryPort);
  container.register("IToolPort", toolPort);
  container.register("ISchedulerPort", schedulerPort);

  // Register use cases with dependencies
  const messageRepository = container.resolve<PostgresMessageRepository>("IMessageRepository");
  const conversationRepository = container.resolve<PostgresConversationRepository>("IConversationRepository");
  const memoryRepository = container.resolve<QdrantMemoryRepository>("IMemoryRepository");
  const taskRepository = container.resolve<RedisTaskRepository>("ITaskRepository");

  const processMessageUseCase = new ProcessMessageUseCase(
    chatPort,
    messageRepository,
    eventPublisher
  );
  
  const getConversationUseCase = new GetConversationUseCase(
    messageRepository
  );
  
  const searchMemoriesUseCase = new SearchMemoriesUseCase(
    memoryPort
  );
  
  const createMemoryUseCase = new CreateMemoryUseCase(
    memoryPort
  );
  
  const getMemoryUseCase = new GetMemoryUseCase(
    memoryPort
  );
  
  const listMemoriesUseCase = new ListMemoriesUseCase(
    memoryPort
  );
  
  const updateMemoryUseCase = new UpdateMemoryUseCase(
    memoryPort
  );
  
  const deleteMemoryUseCase = new DeleteMemoryUseCase(
    memoryRepository
  );
  
  const executeToolUseCase = new ExecuteToolUseCase(
    toolPort
  );
  
  const listToolsUseCase = new ListToolsUseCase(
    toolPort
  );
  
  const createTaskUseCase = new CreateTaskUseCase(
    schedulerPort
  );
  
  const executeTaskUseCase = new ExecuteTaskUseCase(
    schedulerPort,
    eventPublisher
  );
  
  const getTaskUseCase = new GetTaskUseCase(
    schedulerPort
  );
  
  const listTasksUseCase = new ListTasksUseCase(
    schedulerPort
  );
  
  const updateTaskUseCase = new UpdateTaskUseCase(
    schedulerPort
  );
  
  const deleteTaskUseCase = new DeleteTaskUseCase(
    schedulerPort
  );
  
  const setTaskEnabledUseCase = new SetTaskEnabledUseCase(
    schedulerPort
  );

  container.register("ProcessMessageUseCase", processMessageUseCase);
  container.register("GetConversationUseCase", getConversationUseCase);
  container.register("SearchMemoriesUseCase", searchMemoriesUseCase);
  container.register("CreateMemoryUseCase", createMemoryUseCase);
  container.register("GetMemoryUseCase", getMemoryUseCase);
  container.register("ListMemoriesUseCase", listMemoriesUseCase);
  container.register("UpdateMemoryUseCase", updateMemoryUseCase);
  container.register("DeleteMemoryUseCase", deleteMemoryUseCase);
  container.register("ExecuteToolUseCase", executeToolUseCase);
  container.register("ListToolsUseCase", listToolsUseCase);
  container.register("CreateTaskUseCase", createTaskUseCase);
  container.register("ExecuteTaskUseCase", executeTaskUseCase);
  container.register("GetTaskUseCase", getTaskUseCase);
  container.register("ListTasksUseCase", listTasksUseCase);
  container.register("UpdateTaskUseCase", updateTaskUseCase);
  container.register("DeleteTaskUseCase", deleteTaskUseCase);
  container.register("SetTaskEnabledUseCase", setTaskEnabledUseCase);

  logInfo("Bootstrap: Application initialized");
}

