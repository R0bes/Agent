import type { FastifyInstance } from "fastify";
import { getTools, getToolByName, getAllToolsWithStatus } from "../legacy/components/registry";
import { toolboxStore } from "../components/toolbox/toolboxStore";
import { bffService } from "../services/bffService";
import { logInfo, logDebug, logWarn, logError } from "../utils/logger";

export async function registerToolsRoutes(app: FastifyInstance) {
  // Get all tools with their information and status (for GUI)
  app.get("/api/tools", async (req, reply) => {
    logDebug("Tools API: List tools request", {
      requestId: req.id
    });

    const toolsWithStatus = getAllToolsWithStatus();
    const tools = toolsWithStatus.map(({ tool, enabled }) => ({
      name: tool.name,
      shortDescription: tool.shortDescription,
      description: tool.description,
      parameters: tool.parameters,
      examples: tool.examples,
      enabled,
      enabledForPersona: enabled, // TODO: Implement context-specific enabling
      enabledForWorker: false,    // TODO: Implement context-specific enabling
      status: enabled ? "healthy" : undefined, // TODO: Implement real health checks
      lastError: undefined // TODO: Track last error per tool
    }));
    
    logInfo("Tools API: Tools list retrieved", {
      toolCount: tools.length,
      requestId: req.id
    });

    return reply.send({ ok: true, data: tools });
  });

  // Get a specific tool by name
  app.get<{ Params: { name: string } }>("/api/tools/:name", async (req, reply) => {
    const { name } = req.params;
    
    logDebug("Tools API: Get tool request", {
      toolName: name,
      requestId: req.id
    });

    const tool = getToolByName(name);

    if (!tool) {
      logWarn("Tools API: Tool not found", {
        toolName: name,
        requestId: req.id
      });
      return reply.status(404).send({
        ok: false,
        error: `Tool "${name}" not found`
      });
    }

    logInfo("Tools API: Tool retrieved", {
      toolName: name,
      requestId: req.id
    });

    return reply.send({
      ok: true,
      data: {
        name: tool.name,
        shortDescription: tool.shortDescription,
        description: tool.description,
        parameters: tool.parameters,
        examples: tool.examples
      }
    });
  });

  // Enable a tool
  app.post<{ Params: { name: string } }>("/api/tools/:name/enable", async (req, reply) => {
    const { name } = req.params;
    
    logDebug("Tools API: Enable tool request", {
      toolName: name,
      requestId: req.id
    });

    const tool = getToolByName(name);
    if (!tool) {
      logWarn("Tools API: Tool not found for enable", {
        toolName: name,
        requestId: req.id
      });
      return reply.status(404).send({
        ok: false,
        error: `Tool "${name}" not found`
      });
    }

    try {
      await toolboxStore.enableTool(name);
      logInfo("Tools API: Tool enabled", {
        toolName: name,
        requestId: req.id
      });
      return reply.send({
        ok: true,
        data: { toolName: name, enabled: true }
      });
    } catch (err) {
      logError("Tools API: Failed to enable tool", err, {
        toolName: name,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to enable tool"
      });
    }
  });

  // Disable a tool
  app.post<{ Params: { name: string } }>("/api/tools/:name/disable", async (req, reply) => {
    const { name } = req.params;
    
    logDebug("Tools API: Disable tool request", {
      toolName: name,
      requestId: req.id
    });

    const tool = getToolByName(name);
    if (!tool) {
      logWarn("Tools API: Tool not found for disable", {
        toolName: name,
        requestId: req.id
      });
      return reply.status(404).send({
        ok: false,
        error: `Tool "${name}" not found`
      });
    }

    // Don't allow disabling the toolbox itself
    if (name === "toolbox") {
      logWarn("Tools API: Cannot disable toolbox", {
        requestId: req.id
      });
      return reply.status(400).send({
        ok: false,
        error: "Cannot disable the toolbox tool"
      });
    }

    try {
      await toolboxStore.disableTool(name);
      logInfo("Tools API: Tool disabled", {
        toolName: name,
        requestId: req.id
      });
      return reply.send({
        ok: true,
        data: { toolName: name, enabled: false }
      });
    } catch (err) {
      logError("Tools API: Failed to disable tool", err, {
        toolName: name,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to disable tool"
      });
    }
  });

  // Get all tool sets (new ToolSet-based API)
  app.get("/api/tool-sets", async (req, reply) => {
    logDebug("Tools API: List tool sets request", {
      requestId: req.id
    });

    try {
      const toolSets = await bffService.callToolbox("getAllToolSets", {});
      
      logInfo("Tools API: Tool sets list retrieved", {
        toolSetCount: toolSets.length,
        requestId: req.id
      });

      return reply.send({ ok: true, data: toolSets });
    } catch (err) {
      logError("Tools API: Failed to list tool sets", err, {
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to list tool sets"
      });
    }
  });

  // Get all tools from all tool sets
  app.get("/api/tool-sets/tools", async (req, reply) => {
    logDebug("Tools API: List all tools from tool sets request", {
      requestId: req.id
    });

    try {
      const tools = await bffService.callToolbox("getAllTools", {});
      
      logInfo("Tools API: All tools from tool sets retrieved", {
        toolCount: tools.length,
        requestId: req.id
      });

      return reply.send({ ok: true, data: tools });
    } catch (err) {
      logError("Tools API: Failed to list tools from tool sets", err, {
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to list tools from tool sets"
      });
    }
  });

  // Get tools from a specific tool set
  app.get<{ Params: { id: string } }>("/api/tool-sets/:id/tools", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Tools API: List tools from tool set request", {
      toolSetId: id,
      requestId: req.id
    });

    try {
      const tools = await bffService.callToolbox("getToolsFromToolSet", { toolSetId: id });
      
      logInfo("Tools API: Tools from tool set retrieved", {
        toolSetId: id,
        toolCount: tools.length,
        requestId: req.id
      });

      return reply.send({ ok: true, data: tools });
    } catch (err) {
      logError("Tools API: Failed to list tools from tool set", err, {
        toolSetId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to list tools from tool set"
      });
    }
  });

  // Start InternalToolSet
  app.post<{ Params: { id: string } }>("/api/tool-sets/:id/start", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Tools API: Start tool set request", {
      toolSetId: id,
      requestId: req.id
    });

    try {
      await bffService.callToolbox("startToolSet", { id });
      logInfo("Tools API: Tool set started", {
        toolSetId: id,
        requestId: req.id
      });
      return reply.send({
        ok: true,
        data: { toolSetId: id, started: true }
      });
    } catch (err) {
      logError("Tools API: Failed to start tool set", err, {
        toolSetId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to start tool set"
      });
    }
  });

  // Stop InternalToolSet
  app.post<{ Params: { id: string } }>("/api/tool-sets/:id/stop", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Tools API: Stop tool set request", {
      toolSetId: id,
      requestId: req.id
    });

    try {
      await bffService.callToolbox("stopToolSet", { id });
      logInfo("Tools API: Tool set stopped", {
        toolSetId: id,
        requestId: req.id
      });
      return reply.send({
        ok: true,
        data: { toolSetId: id, stopped: true }
      });
    } catch (err) {
      logError("Tools API: Failed to stop tool set", err, {
        toolSetId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to stop tool set"
      });
    }
  });

  // Connect ExternalToolSet
  app.post<{ Params: { id: string } }>("/api/tool-sets/:id/connect", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Tools API: Connect tool set request", {
      toolSetId: id,
      requestId: req.id
    });

    try {
      await bffService.callToolbox("connectToolSet", { id });
      logInfo("Tools API: Tool set connected", {
        toolSetId: id,
        requestId: req.id
      });
      return reply.send({
        ok: true,
        data: { toolSetId: id, connected: true }
      });
    } catch (err) {
      logError("Tools API: Failed to connect tool set", err, {
        toolSetId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to connect tool set"
      });
    }
  });

  // Disconnect ExternalToolSet
  app.post<{ Params: { id: string } }>("/api/tool-sets/:id/disconnect", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Tools API: Disconnect tool set request", {
      toolSetId: id,
      requestId: req.id
    });

    try {
      await bffService.callToolbox("disconnectToolSet", { id });
      logInfo("Tools API: Tool set disconnected", {
        toolSetId: id,
        requestId: req.id
      });
      return reply.send({
        ok: true,
        data: { toolSetId: id, disconnected: true }
      });
    } catch (err) {
      logError("Tools API: Failed to disconnect tool set", err, {
        toolSetId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to disconnect tool set"
      });
    }
  });

  // Call a tool (execute tool with arguments)
  app.post<{ Params: { name: string }; Body: { args?: any } }>("/api/tools/:name/call", async (req, reply) => {
    const { name } = req.params;
    const { args = {} } = req.body;
    
    logDebug("Tools API: Call tool request", {
      toolName: name,
      requestId: req.id,
      hasArgs: !!args && Object.keys(args).length > 0
    });

    // Create a minimal ToolContext for UI calls
    const ctx = {
      userId: "ui-user",
      conversationId: "ui-conversation",
      source: {
        id: "ui",
        kind: "gui" as const,
        label: "Toolbox UI",
        meta: {}
      }
    };

    try {
      const result = await bffService.callToolbox("executeTool", { toolName: name, args, ctx });
      
      logInfo("Tools API: Tool executed", {
        toolName: name,
        success: result.ok,
        requestId: req.id
      });

      return reply.send({
        ok: result.ok,
        data: result.data,
        error: result.error
      });
    } catch (err) {
      logError("Tools API: Failed to execute tool", err, {
        toolName: name,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to execute tool"
      });
    }
  });
}

