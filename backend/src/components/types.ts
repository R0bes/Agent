/**
 * Component Architecture Types
 * 
 * Components are self-contained units/modules that can implement one or more abstractions:
 * - Service: System-relevant services (e.g., LLM, Persona)
 * - Tool: Can be executed by agents, has MCP endpoints (LLM is also a tool)
 * - Source: Sends events into the system that land at the persona
 */

import type { ToolResult, ToolContext, ToolExample } from "./tools/toolTypes";
import type { SourceDescriptor, SourceKind, SourceMessage } from "./sources/types";

// Re-export for convenience
export type { SourceDescriptor, SourceKind, SourceMessage };
export type { ToolResult, ToolContext, ToolExample };

/**
 * Service abstraction: System-relevant services
 */
export interface ServiceInterface {
  /** Unique identifier for this service */
  id: string;
  /** Human-readable name */
  name: string;
  /** Service description */
  description?: string;
  /** Initialize the service */
  initialize?(): Promise<void> | void;
  /** Shutdown/cleanup the service */
  shutdown?(): Promise<void> | void;
}

/**
 * Tool abstraction: Can be executed by agents, has MCP endpoints
 */
export interface ToolInterface {
  /** Unique tool name */
  name: string;
  /** Short, concise description (one line) */
  shortDescription: string;
  /** Detailed description explaining what the tool does, when to use it, etc. */
  description: string;
  /** JSON-schema-like object for parameters */
  parameters?: Record<string, unknown>;
  /** Examples demonstrating how to use this tool */
  examples?: ToolExample[];
  /** Execute the tool */
  execute(args: any, ctx: ToolContext): Promise<ToolResult>;
}


/**
 * Source abstraction: Sends events into the system that land at the persona
 */
export interface SourceInterface {
  /** Unique identifier for this source */
  id: string;
  /** Source kind (gui, scheduler, whatsapp, etc.) */
  kind: SourceKind;
  /** Optional human-readable label */
  label?: string;
  /** Convert raw incoming payload into SourceMessages */
  toSourceMessages(raw: any): Promise<SourceMessage[]>;
  /** Process incoming raw data and send to persona */
  process(raw: any): Promise<void>;
}

/**
 * Worker abstraction: Background tasks that process jobs from a queue
 */
export interface WorkerInterface {
  /** Unique worker name */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Worker category (memory, tool, think, etc.) */
  readonly category: string;
  /** Process a job - takes job from queue and processes it */
  processJob(job: WorkerJob): Promise<void>;
}

export interface WorkerJob {
  id: string;
  workerName: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  args: any;
  ctx: ToolContext;
  error?: string;
}

/**
 * Component: Self-contained unit that can implement Service, Tool, Source, Worker or combinations
 */
export interface Component {
  /** Unique component identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Component description */
  description?: string;
  /** Service interface (if this component is a service) */
  service?: ServiceInterface;
  /** Tool interface (if this component is a tool) */
  tool?: ToolInterface;
  /** Source interface (if this component is a source) */
  source?: SourceInterface;
  /** Worker interface (if this component is a worker) */
  worker?: WorkerInterface;
  /** Initialize the component */
  initialize?(): Promise<void> | void;
  /** Shutdown/cleanup the component */
  shutdown?(): Promise<void> | void;
}

