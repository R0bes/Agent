/**
 * Abstract Tool Base Class
 * 
 * Tools that extend this class will automatically:
 * - Register themselves with the tool registry
 * - Provide correct endpoints
 */

import type { ToolInterface, ToolContext, ToolResult, ToolExample } from "../types";
import { registerTool } from "./toolRegistry";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

export abstract class AbstractTool implements ToolInterface {
  abstract readonly name: string;
  abstract readonly shortDescription: string;
  abstract readonly description: string;
  abstract readonly parameters?: Record<string, unknown>;
  abstract readonly examples?: ToolExample[];

  /**
   * Execute the tool - must be implemented by subclasses
   */
  abstract execute(args: any, ctx: ToolContext): Promise<ToolResult>;

  /**
   * Constructor automatically registers the tool
   * Uses queueMicrotask to ensure registration happens after property initialization
   */
  constructor() {
    // Register this tool with the registry after property initialization
    // Use queueMicrotask to ensure all properties are set before registration
    queueMicrotask(() => {
      if (!this.name) {
        logWarn("AbstractTool: Tool name is undefined, skipping registration", {
          toolClass: this.constructor.name
        });
        return;
      }
      try {
        registerTool(this);
      } catch (err) {
        logError("AbstractTool: Failed to register tool", err, {
          toolName: this.name,
          toolClass: this.constructor.name
        });
      }
    });
  }

  /**
   * Execute with logging wrapper
   */
  async executeWithLogging(args: any, ctx: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    logDebug("Tool execution started", {
      toolName: this.name,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      sourceKind: ctx.source.kind,
      args: JSON.stringify(args)
    });

    try {
      const result = await this.execute(args, ctx);
      const duration = Date.now() - startTime;
      
      if (result.ok) {
        logInfo("Tool execution succeeded", {
          toolName: this.name,
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          duration: `${duration}ms`
        });
      } else {
        logWarn("Tool execution failed", {
          toolName: this.name,
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          error: result.error,
          duration: `${duration}ms`
        });
      }
      
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      logError("Tool execution threw error", err, {
        toolName: this.name,
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        duration: `${duration}ms`
      });
      throw err;
    }
  }

  /**
   * Get tool info for API endpoints
   */
  getInfo() {
    return {
      name: this.name,
      shortDescription: this.shortDescription,
      description: this.description,
      parameters: this.parameters,
      examples: this.examples
    };
  }
}

