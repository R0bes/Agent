// Note: EventBus does not log via logger to avoid circular logging
// Logs are published via event bus, which the LogManager handles

export type EventType =
  | "message_created"
  | "job_updated"
  | "memory_updated"
  | "source_message"
  | "scheduler_task_updated"
  | "gui_action"
  | "gui_response"
  | "avatar_poke"
  | "avatar_command"
  | "tool_execute"
  | "tool_executed"
  | "log_trace"
  | "log_debug"
  | "log_info"
  | "log_warn"
  | "log_error"
  | "log_fatal";

export interface BaseEvent<TType extends EventType = EventType, TPayload = any> {
  type: TType;
  payload: TPayload;
}

// Production-ready: NATS Event Bus
import { NatsEventBus } from './natsEventBus';

export const eventBus = new NatsEventBus();
