/**
 * MemoryToolSet
 * 
 * SystemToolSet für Memory-Funktionen.
 * Bietet Tools:
 * - query_memories: Semantische Suche nach Memories
 * - add_memory: Memory hinzufügen
 * - list_memories: Memories auflisten mit Filtern
 */

import { SystemToolSet } from "./systemToolSet";
import type { ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { memoryStore } from "../memory";
import type { MemoryKind } from "../memory/types";
import { logInfo, logDebug, logError } from "../../utils/logger";

/**
 * MemoryToolSet - Memory-Funktionen als SystemToolSet
 * 
 * Registriert sich automatisch beim Systemstart.
 * Bietet Tools zur Verwaltung von Memories.
 */
export class MemoryToolSet extends SystemToolSet {
  readonly id = "memory";
  readonly name = "Memory";

  constructor() {
    super();
  }

  /**
   * Liste aller Tools in diesem ToolSet
   */
  async listTools(): Promise<ToolDescriptor[]> {
    return [
      {
        name: "query_memories",
        description: "Searches for memories that are semantically similar to the provided query text. This tool uses vector embeddings to find the most relevant memories based on meaning, not just keyword matching. Returns a list of memories with their similarity scores, sorted by relevance. Use this when you need to find information that the user has mentioned before or when looking for context about a specific topic.",
        shortDescription: "Search for memories using semantic similarity search.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query text. This will be converted to an embedding and used to find similar memories."
            },
            kind: {
              type: "string",
              enum: ["fact", "preference", "summary", "episode"],
              description: "Optional: Filter memories by kind. If not provided, searches all kinds."
            },
            limit: {
              type: "number",
              description: "Maximum number of memories to return. Default is 5.",
              default: 5
            }
          },
          required: ["query"]
        },
        examples: [
          {
            input: {
              query: "user preferences about code style",
              kind: "preference",
              limit: 3
            },
            output: {
              ok: true,
              data: {
                memories: [
                  {
                    id: "mem-123",
                    kind: "preference",
                    title: "Code Style Preferences",
                    content: "User prefers clean code architecture and TypeScript",
                    similarity: 0.92
                  }
                ],
                count: 1
              }
            },
            description: "Search for user preferences about code style"
          }
        ]
      },
      {
        name: "add_memory",
        description: "Manually creates a new memory entry in the memory store. Use this when you want to explicitly save information that the user has shared, such as facts about them, their preferences, summaries of conversations, or notable events/episodes. The memory will be stored persistently and can be retrieved later using query_memories or list_memories tools.",
        shortDescription: "Add a new memory to the memory store.",
        parameters: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["fact", "preference", "summary", "episode"],
              description: "The type of memory: 'fact' for stable factual information, 'preference' for user likes/dislikes, 'summary' for conversation summaries, 'episode' for notable events."
            },
            title: {
              type: "string",
              description: "A short, descriptive title for the memory."
            },
            content: {
              type: "string",
              description: "The detailed content of the memory."
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional: Array of tags to categorize the memory."
            }
          },
          required: ["kind", "title", "content"]
        },
        examples: [
          {
            input: {
              kind: "fact",
              title: "User's Profession",
              content: "User is a software developer working on AI projects",
              tags: ["profession", "work"]
            },
            output: {
              ok: true,
              data: {
                memory: {
                  id: "mem-123",
                  kind: "fact",
                  title: "User's Profession",
                  content: "User is a software developer working on AI projects",
                  createdAt: "2024-01-01T12:00:00Z"
                }
              }
            },
            description: "Add a fact about the user's profession"
          }
        ]
      },
      {
        name: "list_memories",
        description: "Retrieves a list of memories from the memory store, optionally filtered by kind, tags, or other criteria. This is useful for getting an overview of what information is stored, or for finding specific types of memories. Unlike query_memories which uses semantic search, this tool returns memories based on exact filters and sorting by creation date.",
        shortDescription: "List memories with optional filters.",
        parameters: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["fact", "preference", "summary", "episode"],
              description: "Optional: Filter memories by kind."
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional: Filter memories that contain any of these tags."
            },
            limit: {
              type: "number",
              description: "Maximum number of memories to return. Default is 20.",
              default: 20
            },
            offset: {
              type: "number",
              description: "Number of memories to skip for pagination. Default is 0.",
              default: 0
            }
          },
          required: []
        },
        examples: [
          {
            input: {
              kind: "preference",
              limit: 10
            },
            output: {
              ok: true,
              data: {
                memories: [
                  {
                    id: "mem-123",
                    kind: "preference",
                    title: "Code Style Preferences",
                    content: "User prefers clean code architecture",
                    createdAt: "2024-01-01T12:00:00Z"
                  }
                ],
                count: 1
              }
            },
            description: "List all preference memories"
          }
        ]
      }
    ];
  }

  /**
   * Führe ein Tool aus
   */
  async callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    try {
      switch (name) {
        case "query_memories":
          return await this.queryMemories(args, ctx);

        case "add_memory":
          return await this.addMemory(args, ctx);

        case "list_memories":
          return await this.listMemories(args, ctx);

        default:
          return {
            ok: false,
            error: `Unknown tool: ${name}`
          };
      }
    } catch (err) {
      logError("MemoryToolSet: Tool execution failed", err, {
        toolName: name,
        toolSetId: this.id
      });
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Query Memories - Semantische Suche
   */
  private async queryMemories(
    args: { query: string; kind?: MemoryKind; limit?: number },
    ctx: ToolContext
  ): Promise<ToolResult> {
    try {
      logInfo("MemoryToolSet: Executing query_memories", {
        userId: ctx.userId,
        query: args.query,
        kind: args.kind,
        limit: args.limit
      });

      const memories = await memoryStore.search({
        query: args.query,
        userId: ctx.userId,
        kinds: args.kind ? [args.kind] : undefined,
        limit: args.limit || 5
      });

      logDebug("MemoryToolSet: Search completed", {
        resultCount: memories.length,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: {
          memories: memories.map(m => ({
            id: m.id,
            kind: m.kind,
            title: m.title,
            content: m.content,
            tags: m.tags,
            createdAt: m.createdAt
          })),
          count: memories.length
        }
      };
    } catch (err) {
      logError("MemoryToolSet: query_memories failed", err, {
        userId: ctx.userId,
        query: args.query
      });
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Add Memory - Memory hinzufügen
   */
  private async addMemory(
    args: {
      kind: MemoryKind;
      title: string;
      content: string;
      tags?: string[];
    },
    ctx: ToolContext
  ): Promise<ToolResult> {
    try {
      logInfo("MemoryToolSet: Executing add_memory", {
        userId: ctx.userId,
        kind: args.kind,
        title: args.title
      });

      const memory = await memoryStore.add({
        userId: ctx.userId,
        kind: args.kind,
        title: args.title,
        content: args.content,
        tags: args.tags,
        conversationId: ctx.conversationId
      });

      logDebug("MemoryToolSet: Memory added", {
        memoryId: memory.id,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: {
          memory: {
            id: memory.id,
            kind: memory.kind,
            title: memory.title,
            content: memory.content,
            tags: memory.tags,
            createdAt: memory.createdAt
          }
        }
      };
    } catch (err) {
      logError("MemoryToolSet: add_memory failed", err, {
        userId: ctx.userId,
        kind: args.kind
      });
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * List Memories - Memories auflisten
   */
  private async listMemories(
    args: {
      kind?: MemoryKind;
      tags?: string[];
      limit?: number;
      offset?: number;
    },
    ctx: ToolContext
  ): Promise<ToolResult> {
    try {
      logInfo("MemoryToolSet: Executing list_memories", {
        userId: ctx.userId,
        kind: args.kind,
        tags: args.tags,
        limit: args.limit
      });

      const memories = await memoryStore.list({
        userId: ctx.userId,
        kinds: args.kind ? [args.kind] : undefined,
        tags: args.tags,
        limit: args.limit || 20,
        offset: args.offset || 0
      });

      logDebug("MemoryToolSet: List completed", {
        resultCount: memories.length,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: {
          memories: memories.map(m => ({
            id: m.id,
            kind: m.kind,
            title: m.title,
            content: m.content,
            tags: m.tags,
            createdAt: m.createdAt
          })),
          count: memories.length
        }
      };
    } catch (err) {
      logError("MemoryToolSet: list_memories failed", err, {
        userId: ctx.userId
      });
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Health Check
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      // Prüfe ob memoryStore verfügbar ist
      // Versuche eine einfache Operation
      await memoryStore.list({ limit: 1 });
      
      return {
        status: "healthy",
        lastCheck: new Date().toISOString()
      };
    } catch (err) {
      return {
        status: "unhealthy",
        lastCheck: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}

