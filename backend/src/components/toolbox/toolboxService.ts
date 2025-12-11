/**
 * Toolbox Service Implementation (Threaded)
 * 
 * Manages all ToolSets (SystemToolSet, InternalToolSet, ExternalToolSet).
 * Registry aller ToolSets.
 * Event-basierte Tool Execution über Worker Engine.
 */

import { ThreadedService } from "../base/ThreadedService";
import { toolboxStore } from "./toolboxStore";
import { SystemToolSet } from "./systemToolSet";
import { InternalToolSet } from "./internalToolSet";
import { ExternalToolSet, type ExternalToolSetConfig } from "./externalToolSet";
import { ToolboxToolSet } from "./toolboxToolSet";
import { AvatarToolSet } from "./avatarToolSet";
import { MemoryToolSet } from "./memoryToolSet";
import type { ToolSet, ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import type { BaseEvent, EventType } from "../../events/eventBus";
import { bullMQWorkerEngine } from "../worker/bullmq-engine";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_FILE = join(__dirname, "../../../toolbox-config.json");

export class ThreadedToolboxService extends ThreadedService {
  readonly id = "toolbox";
  readonly name = "Toolbox Service";

  private toolSets = new Map<string, ToolSet>();
  private toolboxToolSet: ToolboxToolSet;

  constructor() {
    super();
    // Erstelle ToolboxToolSet (SystemToolSet)
    this.toolboxToolSet = new ToolboxToolSet();
    this.toolboxToolSet.setToolboxService(this);
    this.toolSets.set(this.toolboxToolSet.id, this.toolboxToolSet);
    
    // Registriere MemoryToolSet (SystemToolSet)
    const memoryToolSet = new MemoryToolSet();
    this.toolSets.set(memoryToolSet.id, memoryToolSet);
    
    // SchedulerToolSet removed - replaced by SchedulerService
    
    // WorkerManagerToolSet wird in onCustomInitialize() registriert (async import)
  }

  /**
   * Event types this service subscribes to
   */
  protected getSubscribedEvents(): EventType[] {
    return ["tool_execute"];
  }

  /**
   * Service initialization (runs in thread)
   */
  protected async onCustomInitialize(): Promise<void> {
    try {
      await toolboxStore.initialize();
      this.logDebug("Store initialized");
    } catch (err) {
      this.logError("Failed to initialize store", err);
      throw err;
    }
    
    try {
      // Registriere WorkerManagerToolSet (SystemToolSet)
      // Nutze Singleton-Instanz (async import)
      const { getWorkerManagerToolSet } = await import("./workerManagerToolSet");
      const workerManagerToolSet = getWorkerManagerToolSet();
      this.toolSets.set(workerManagerToolSet.id, workerManagerToolSet);
      this.logDebug("WorkerManagerToolSet registered");
    } catch (err) {
      this.logError("Failed to register WorkerManagerToolSet", err);
      throw err;
    }
    
    try {
      // Registriere SystemToolSets
      const avatarToolSet = new AvatarToolSet();
      this.registerSystemToolSet(avatarToolSet);
      this.logDebug("AvatarToolSet registered");
    } catch (err) {
      this.logError("Failed to register AvatarToolSet", err);
      throw err;
    }
    
    try {
      // Lade externe ToolSets aus Konfiguration
      await this.loadExternalToolSets();
      this.logDebug("External tool sets loaded");
    } catch (err) {
      this.logError("Failed to load external tool sets", err);
      // Don't throw - external tool sets are optional
    }

    this.logInfo("Initialized", {
      toolSetCount: this.toolSets.size
    });
  }

  /**
   * Service shutdown (runs in thread)
   */
  protected async onCustomShutdown(): Promise<void> {
    // Disconnect all external tool sets
    for (const toolSet of this.toolSets.values()) {
      if (toolSet instanceof ExternalToolSet) {
        try {
          await toolSet.disconnect();
        } catch (err) {
          this.logError("Failed to disconnect external tool set", err, {
            toolSetId: toolSet.id
          });
        }
      }
    }
  }

  /**
   * Handle direct service calls (runs in thread)
   */
  protected async onMessage(message: { method: string; args: any }): Promise<any> {
    switch (message.method) {
      case "getAllToolSets":
        return await this.getAllToolSets();
      case "getAllTools":
        return await this.getAllTools();
      case "getToolsFromToolSet":
        return await this.getToolsFromToolSet(message.args.toolSetId);
      case "executeTool":
        return await this.executeTool(message.args.toolName, message.args.args, message.args.ctx);
      case "registerSystemToolSet":
        this.registerSystemToolSet(message.args.toolSet);
        return { success: true };
      case "registerInternalToolSet":
        this.registerInternalToolSet(message.args.toolSet);
        return { success: true };
      case "startToolSet":
        return await this.startToolSet(message.args.id);
      case "stopToolSet":
        return await this.stopToolSet(message.args.id);
      case "connectToolSet":
        return await this.connectToolSet(message.args.id);
      case "disconnectToolSet":
        return await this.disconnectToolSet(message.args.id);
      case "enableToolSet":
        return await this.enableToolSet(message.args.id);
      case "disableToolSet":
        return await this.disableToolSet(message.args.id);
      case "getToolSetStatus":
        return await this.getToolSetStatus(message.args.id);
      default:
        throw new Error(`Unknown method: ${message.method}`);
    }
  }

  /**
   * Handle events (runs in thread)
   */
  protected async onEvent(event: BaseEvent): Promise<void> {
    if (event.type === "tool_execute") {
      await this.handleToolExecuteEvent(event.payload);
    }
  }

  /**
   * Registriere ein SystemToolSet (automatische Registrierung)
   */
  registerSystemToolSet(toolSet: SystemToolSet): void {
    if (this.toolSets.has(toolSet.id)) {
      this.logWarn("SystemToolSet already registered", {
        toolSetId: toolSet.id
      });
      return;
    }

    this.toolSets.set(toolSet.id, toolSet);
    this.logInfo("SystemToolSet registered", {
      toolSetId: toolSet.id,
      toolSetName: toolSet.name
    });
  }

  /**
   * Registriere ein InternalToolSet
   */
  registerInternalToolSet(toolSet: InternalToolSet): void {
    if (this.toolSets.has(toolSet.id)) {
      this.logWarn("InternalToolSet already registered", {
        toolSetId: toolSet.id
      });
      return;
    }

    this.toolSets.set(toolSet.id, toolSet);
    this.logInfo("InternalToolSet registered", {
      toolSetId: toolSet.id,
      toolSetName: toolSet.name
    });
  }

  /**
   * Lade externe ToolSets aus Konfiguration
   */
  private async loadExternalToolSets(): Promise<void> {
    try {
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      const config = JSON.parse(data);
      const externalConfigs: ExternalToolSetConfig[] = config.externalToolSets || [];

      for (const toolSetConfig of externalConfigs) {
        // Check if enabled (optional property in config JSON)
        const enabled = (toolSetConfig as any).enabled !== false; // Default to true if not specified
        if (enabled) {
          const toolSet = new ExternalToolSet(toolSetConfig);
          this.toolSets.set(toolSet.id, toolSet);
          
          // Verbinde zum externen MCP-Server
          try {
            await toolSet.connect();
          } catch (err) {
            this.logError("Failed to connect external tool set", err, {
              toolSetId: toolSet.id
            });
          }
        }
      }

      this.logInfo("External tool sets loaded", {
        count: externalConfigs.length
      });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.logDebug("No config file found, creating default");
        await this.createDefaultConfig();
      } else {
        this.logWarn("Failed to load external tool sets config", {
          error: err.message
        });
      }
    }
  }

  /**
   * Erstelle Standard-Konfiguration
   */
  private async createDefaultConfig(): Promise<void> {
    const defaultConfig = {
      externalToolSets: []
    };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8");
  }

  /**
   * Hole alle ToolSets
   */
  async getAllToolSets(): Promise<Array<{
    id: string;
    name: string;
    type: "system" | "internal" | "external";
    health: HealthStatus;
  }>> {
    const result = [];

    for (const toolSet of this.toolSets.values()) {
      const type = this.getToolSetType(toolSet);
      const health = await toolSet.checkHealth();

      result.push({
        id: toolSet.id,
        name: toolSet.name,
        type,
        health
      });
    }

    return result;
  }

  /**
   * Hole alle Tools von allen ToolSets
   */
  async getAllTools(): Promise<Array<ToolDescriptor & { toolSetId: string; toolSetName: string }>> {
    const allTools: Array<ToolDescriptor & { toolSetId: string; toolSetName: string }> = [];

    for (const toolSet of this.toolSets.values()) {
      try {
        const tools = await toolSet.listTools();
        for (const tool of tools) {
          // Ensure shortDescription is max 50 characters
          const truncatedShortDescription = tool.shortDescription.length > 50
            ? tool.shortDescription.substring(0, 47) + "..."
            : tool.shortDescription;
          
          allTools.push({
            ...tool,
            shortDescription: truncatedShortDescription,
            toolSetId: toolSet.id,
            toolSetName: toolSet.name
          });
        }
      } catch (err) {
        this.logError("Failed to list tools from tool set", err, {
          toolSetId: toolSet.id
        });
      }
    }

    return allTools;
  }

  /**
   * Hole alle Tools von einem spezifischen ToolSet
   */
  async getToolsFromToolSet(toolSetId: string): Promise<ToolDescriptor[]> {
    const toolSet = this.toolSets.get(toolSetId);
    if (!toolSet) {
      throw new Error(`Tool set "${toolSetId}" not found`);
    }

    try {
      const tools = await toolSet.listTools();
      // Ensure shortDescription is max 50 characters
      return tools.map(tool => ({
        ...tool,
        shortDescription: tool.shortDescription.length > 50
          ? tool.shortDescription.substring(0, 47) + "..."
          : tool.shortDescription
      }));
    } catch (err) {
      this.logError("Failed to list tools from tool set", err, {
        toolSetId
      });
      throw err;
    }
  }

  /**
   * Führe ein Tool aus (findet automatisch das richtige ToolSet)
   */
  async executeTool(toolName: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    // Finde Tool in allen ToolSets
    for (const toolSet of this.toolSets.values()) {
      try {
        const tools = await toolSet.listTools();
        const tool = tools.find(t => t.name === toolName);
        
        if (tool) {
          return await toolSet.callTool(toolName, args, ctx);
        }
      } catch (err) {
        // ToolSet-Fehler - weiter zum nächsten
        this.logDebug("Tool set error, trying next", {
          toolSetId: toolSet.id,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return {
      ok: false,
      error: `Tool "${toolName}" not found in any tool set`
    };
  }

  /**
   * Handle tool_execute Event
   * Wandelt Event in Worker-Manager Event um
   */
  private async handleToolExecuteEvent(payload: {
    id: string;
    toolName: string;
    args: any;
    ctx: ToolContext;
    retry?: { maxAttempts: number; delay: number };
  }): Promise<void> {
    this.logDebug("Handling tool_execute event", {
      toolName: payload.toolName,
      executionId: payload.id
    });

    // Erstelle Job für Tool-Execution-Worker
    try {
      await bullMQWorkerEngine.enqueue(
        "tool-execution",
        {
          executionId: payload.id,
          toolName: payload.toolName,
          toolArgs: payload.args,
          retry: payload.retry
        },
        payload.ctx,
        {
          priority: 0,
          retry: payload.retry?.maxAttempts ?? 3
        }
      );

      this.logInfo("Tool execution job enqueued", {
        toolName: payload.toolName,
        executionId: payload.id
      });
    } catch (err) {
      this.logError("Failed to enqueue tool execution", err, {
        toolName: payload.toolName,
        executionId: payload.id
      });
    }
  }

  /**
   * Starte InternalToolSet
   */
  async startToolSet(id: string): Promise<void> {
    const toolSet = this.toolSets.get(id);
    if (!toolSet) {
      throw new Error(`Tool set "${id}" not found`);
    }

    if (!(toolSet instanceof InternalToolSet)) {
      throw new Error(`Tool set "${id}" is not an InternalToolSet`);
    }

    await toolSet.start();
    this.logInfo("InternalToolSet started", { toolSetId: id });
  }

  /**
   * Stoppe InternalToolSet
   */
  async stopToolSet(id: string): Promise<void> {
    const toolSet = this.toolSets.get(id);
    if (!toolSet) {
      throw new Error(`Tool set "${id}" not found`);
    }

    if (!(toolSet instanceof InternalToolSet)) {
      throw new Error(`Tool set "${id}" is not an InternalToolSet`);
    }

    await toolSet.stop();
    this.logInfo("InternalToolSet stopped", { toolSetId: id });
  }

  /**
   * Verbinde ExternalToolSet
   */
  async connectToolSet(id: string): Promise<void> {
    const toolSet = this.toolSets.get(id);
    if (!toolSet) {
      throw new Error(`Tool set "${id}" not found`);
    }

    if (!(toolSet instanceof ExternalToolSet)) {
      throw new Error(`Tool set "${id}" is not an ExternalToolSet`);
    }

    await toolSet.connect();
    this.logInfo("ExternalToolSet connected", { toolSetId: id });
  }

  /**
   * Trenne ExternalToolSet
   */
  async disconnectToolSet(id: string): Promise<void> {
    const toolSet = this.toolSets.get(id);
    if (!toolSet) {
      throw new Error(`Tool set "${id}" not found`);
    }

    if (!(toolSet instanceof ExternalToolSet)) {
      throw new Error(`Tool set "${id}" is not an ExternalToolSet`);
    }

    await toolSet.disconnect();
    this.logInfo("ExternalToolSet disconnected", { toolSetId: id });
  }

  /**
   * Ermittle ToolSet-Typ
   */
  private getToolSetType(toolSet: ToolSet): "system" | "internal" | "external" {
    if (toolSet instanceof SystemToolSet) {
      return "system";
    } else if (toolSet instanceof InternalToolSet) {
      return "internal";
    } else if (toolSet instanceof ExternalToolSet) {
      return "external";
    }
    return "system"; // Default
  }

  /**
   * Enable ToolSet (für ToolboxToolSet)
   */
  async enableToolSet(id: string): Promise<void> {
    // TODO: Implement enable/disable für ToolSets
    this.logDebug("Enable tool set", { toolSetId: id });
  }

  /**
   * Disable ToolSet (für ToolboxToolSet)
   */
  async disableToolSet(id: string): Promise<void> {
    // TODO: Implement enable/disable für ToolSets
    this.logDebug("Disable tool set", { toolSetId: id });
  }

  /**
   * Hole ToolSet-Status (für ToolboxToolSet)
   */
  async getToolSetStatus(id: string): Promise<any> {
    const toolSet = this.toolSets.get(id);
    if (!toolSet) {
      throw new Error(`Tool set "${id}" not found`);
    }

    const health = await toolSet.checkHealth();
    const type = this.getToolSetType(toolSet);

    return {
      id: toolSet.id,
      name: toolSet.name,
      type,
      health
    };
  }
}

