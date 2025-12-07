/**
 * Toolbox Component
 * 
 * Manages all ToolSets (SystemToolSet, InternalToolSet, ExternalToolSet).
 * Registry aller ToolSets.
 * Event-basierte Tool Execution über Worker Engine.
 */

import { AbstractService } from "../base/AbstractService";
import type { Component } from "../types";
import { toolboxStore } from "./toolboxStore";
import { SystemToolSet } from "./systemToolSet";
import { InternalToolSet } from "./internalToolSet";
import { ExternalToolSet, type ExternalToolSetConfig } from "./externalToolSet";
import { ToolboxToolSet } from "./toolboxToolSet";
import { SchedulerToolSet } from "./schedulerToolSet";
import { WorkerManagerToolSet } from "./workerManagerToolSet";
import { AvatarToolSet } from "./avatarToolSet";
import { MemoryToolSet } from "./memoryToolSet";
import type { ToolSet, ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { eventBus } from "../../events/eventBus";
import { bullMQWorkerEngine } from "../worker/bullmq-engine";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_FILE = join(__dirname, "../../../toolbox-config.json");

/**
 * Toolbox Service Implementation
 */
class ToolboxService extends AbstractService {
  readonly id = "toolbox-service";
  readonly name = "Toolbox Service";
  readonly description = "Manages all tool sets (System, Internal, External)";

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
    
    // Registriere SchedulerToolSet (SystemToolSet)
    const schedulerToolSet = new SchedulerToolSet();
    this.toolSets.set(schedulerToolSet.id, schedulerToolSet);
    
    // Registriere WorkerManagerToolSet (SystemToolSet)
    const workerManagerToolSet = new WorkerManagerToolSet();
    this.toolSets.set(workerManagerToolSet.id, workerManagerToolSet);
  }

  protected async onInitialize(): Promise<void> {
    try {
      await toolboxStore.initialize();
      logDebug("Toolbox: Store initialized");
    } catch (err) {
      logError("Toolbox: Failed to initialize store", err);
      throw err;
    }
    
    try {
      // Registriere SystemToolSets
      const avatarToolSet = new AvatarToolSet();
      this.registerSystemToolSet(avatarToolSet);
      logDebug("Toolbox: AvatarToolSet registered");
    } catch (err) {
      logError("Toolbox: Failed to register AvatarToolSet", err);
      throw err;
    }
    
    try {
      // Lade externe ToolSets aus Konfiguration
      await this.loadExternalToolSets();
      logDebug("Toolbox: External tool sets loaded");
    } catch (err) {
      logError("Toolbox: Failed to load external tool sets", err);
      // Don't throw - external tool sets are optional
    }
    
    // Event-Subscription für tool_execute Events
    eventBus.on("tool_execute", async (event) => {
      await this.handleToolExecuteEvent(event.payload);
    });

    logInfo("Toolbox Service: Initialized", {
      toolSetCount: this.toolSets.size
    });
  }

  /**
   * Registriere ein SystemToolSet (automatische Registrierung)
   */
  registerSystemToolSet(toolSet: SystemToolSet): void {
    if (this.toolSets.has(toolSet.id)) {
      logWarn("Toolbox: SystemToolSet already registered", {
        toolSetId: toolSet.id
      });
      return;
    }

    this.toolSets.set(toolSet.id, toolSet);
    logInfo("Toolbox: SystemToolSet registered", {
      toolSetId: toolSet.id,
      toolSetName: toolSet.name
    });
  }

  /**
   * Registriere ein InternalToolSet
   */
  registerInternalToolSet(toolSet: InternalToolSet): void {
    if (this.toolSets.has(toolSet.id)) {
      logWarn("Toolbox: InternalToolSet already registered", {
        toolSetId: toolSet.id
      });
      return;
    }

    this.toolSets.set(toolSet.id, toolSet);
    logInfo("Toolbox: InternalToolSet registered", {
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
        if (toolSetConfig.enabled) {
          const toolSet = new ExternalToolSet(toolSetConfig);
          this.toolSets.set(toolSet.id, toolSet);
          
          // Verbinde zum externen MCP-Server
          try {
            await toolSet.connect();
          } catch (err) {
            logError("Toolbox: Failed to connect external tool set", err, {
              toolSetId: toolSet.id
            });
          }
        }
      }

      logInfo("Toolbox: External tool sets loaded", {
        count: externalConfigs.length
      });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        logDebug("Toolbox: No config file found, creating default");
        await this.createDefaultConfig();
      } else {
        logWarn("Toolbox: Failed to load external tool sets config", {
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
        logError("Toolbox: Failed to list tools from tool set", err, {
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
      logError("Toolbox: Failed to list tools from tool set", err, {
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
        logDebug("Toolbox: Tool set error, trying next", {
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
    logDebug("Toolbox: Handling tool_execute event", {
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

      logInfo("Toolbox: Tool execution job enqueued", {
        toolName: payload.toolName,
        executionId: payload.id
      });
    } catch (err) {
      logError("Toolbox: Failed to enqueue tool execution", err, {
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
    logInfo("Toolbox: InternalToolSet started", { toolSetId: id });
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
    logInfo("Toolbox: InternalToolSet stopped", { toolSetId: id });
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
    logInfo("Toolbox: ExternalToolSet connected", { toolSetId: id });
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
    logInfo("Toolbox: ExternalToolSet disconnected", { toolSetId: id });
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
    logDebug("Toolbox: Enable tool set", { toolSetId: id });
  }

  /**
   * Disable ToolSet (für ToolboxToolSet)
   */
  async disableToolSet(id: string): Promise<void> {
    // TODO: Implement enable/disable für ToolSets
    logDebug("Toolbox: Disable tool set", { toolSetId: id });
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

// Create service instance
const toolboxService = new ToolboxService();

/**
 * Toolbox Component
 */
export const toolboxComponent: Component = {
  id: "toolbox",
  name: "Toolbox Component",
  description: "Manages all tool sets (System, Internal, External)",
  service: toolboxService,
  async initialize() {
    await toolboxService.initialize();
  }
};

// Export für andere Komponenten
export { toolboxService };
export type { ToolSet, SystemToolSet, InternalToolSet, ExternalToolSet };
