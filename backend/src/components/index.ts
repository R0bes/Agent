/**
 * Components Index
 * 
 * Central export point for components
 * 
 * NOTE: Legacy Component exports have been moved to legacy/components/
 * This file now only exports Threaded Services and utilities that are still in use.
 */

// Re-export utilities (still in use by Threaded Services)
export { toolEngine } from "./tools/toolEngine";
export * from "./tools/toolTypes";
export * from "./sources/types";
export * from "./memory";
export { ollamaChat } from "./llm/ollamaClient";
export type { OllamaChatMessage, OllamaChatOptions, OllamaChatResponse } from "./llm/ollamaClient";

// Threaded Services (not legacy)
export { ThreadedLLMService } from "./llm";
export { ThreadedPersonaService } from "./persona";
export { ThreadedMemoryService } from "./memory";
export { ThreadedToolboxService } from "./toolbox";
export { ThreadedSchedulerService } from "./scheduler";

// Workers (using BullMQ, not legacy Component system)
export { memoryCompactionWorkerComponent } from "./worker/memory";
export { taskWorkerComponent } from "./worker/task";
export { toolExecutionWorkerComponent } from "./worker/toolExecution";
export { bullMQWorkerEngine } from "./worker/bullmq-engine";

