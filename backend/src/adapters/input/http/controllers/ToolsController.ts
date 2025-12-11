/**
 * Tools Controller
 * 
 * HTTP controller for tools-related endpoints
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { container } from "../../../../bootstrap/container";
import { ListToolsUseCase } from "../../../../application/useCases/tools/ListToolsUseCase";
import { ExecuteToolUseCase } from "../../../../application/useCases/tools/ExecuteToolUseCase";
import { ToolContext } from "../../../../domain/valueObjects/ToolContext";
import { logInfo, logDebug, logError } from "../../../../infrastructure/logging/logger";

interface ToolParams {
  name: string;
}

interface ExecuteToolBody {
  name: string;
  args: Record<string, unknown>;
  context?: {
    conversationId?: string;
    userId?: string;
    source?: {
      id: string;
      kind: string;
      label?: string;
    };
  };
}

export class ToolsController {
  /**
   * GET /api/tools
   * List all available tools
   */
  static async listTools(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    logDebug("Tools Controller: List tools request", {
      requestId: req.id
    });

    try {
      const useCase = container.resolve<ListToolsUseCase>("ListToolsUseCase");
      const tools = await useCase.execute();

      logInfo("Tools Controller: Tools list retrieved", {
        toolCount: tools.length,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: tools.map(tool => ({
          name: tool.name,
          shortDescription: tool.shortDescription,
          description: tool.description,
          parameters: tool.parameters,
          examples: tool.examples
        }))
      });
    } catch (err) {
      logError("Tools Controller: Failed to list tools", err, {
        requestId: req.id
      });
      reply.status(500).send({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/tools/:name
   * Get a specific tool by name
   */
  static async getTool(
    req: FastifyRequest<{ Params: ToolParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { name } = req.params;

    logDebug("Tools Controller: Get tool request", {
      toolName: name,
      requestId: req.id
    });

    try {
      const useCase = container.resolve<ListToolsUseCase>("ListToolsUseCase");
      const tools = await useCase.execute();
      const tool = tools.find(t => t.name === name);

      if (!tool) {
        reply.status(404).send({ error: "Tool not found" });
        return;
      }

      reply.send({
        ok: true,
        data: {
          name: tool.name,
          shortDescription: tool.shortDescription,
          description: tool.description,
          parameters: tool.parameters,
          examples: tool.examples
        }
      });
    } catch (err) {
      logError("Tools Controller: Failed to get tool", err, {
        toolName: name,
        requestId: req.id
      });
      reply.status(500).send({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/tools/execute
   * Execute a tool
   */
  static async executeTool(
    req: FastifyRequest<{ Body: ExecuteToolBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { name, args, context } = req.body;

    logDebug("Tools Controller: Execute tool request", {
      toolName: name,
      requestId: req.id
    });

    try {
      const useCase = container.resolve<ExecuteToolUseCase>("ExecuteToolUseCase");
      
      // Create tool context
      const toolContext = context
        ? ToolContext.create(
            context.conversationId || "",
            context.userId || "",
            context.source || { id: "api", kind: "api" }
          )
        : ToolContext.create("", "", { id: "api", kind: "api" });

      const result = await useCase.execute(name, args, toolContext);

      logInfo("Tools Controller: Tool executed successfully", {
        toolName: name,
        requestId: req.id
      });

      reply.send({
        ok: result.ok,
        data: result.data,
        error: result.error
      });
    } catch (err) {
      logError("Tools Controller: Failed to execute tool", err, {
        toolName: name,
        requestId: req.id
      });
      reply.status(500).send({ error: "Internal server error" });
    }
  }
}

