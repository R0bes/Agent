/**
 * Tool Registry Component
 * 
 * Manages the enable/disable status of all tools in the system.
 * Implements both Service and Tool interfaces.
 */

import { AbstractService } from "../base/AbstractService";
import { AbstractTool } from "../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../types";
import { toolRegistryStore } from "./toolRegistryStore";
import { getAllToolsWithStatus, getToolByName } from "../registry";
import { logInfo, logDebug, logError } from "../../utils/logger";

/**
 * Tool Registry Service Implementation
 */
class ToolRegistryService extends AbstractService {
  readonly id = "tool-registry-service";
  readonly name = "Tool Registry Service";
  readonly description = "Manages the enable/disable status of all tools";

  protected async onInitialize(): Promise<void> {
    await toolRegistryStore.initialize();
    logInfo("Tool Registry Service: Initialized");
  }

  async handleCall(call: { method: string; params: Record<string, unknown> }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    switch (call.method) {
      case "listTools":
        return this.success(this.listTools());
      case "enableTool":
        const enableName = call.params.name as string;
        if (!enableName) {
          return this.error("Tool name is required");
        }
        await toolRegistryStore.enableTool(enableName);
        return this.success({ toolName: enableName, enabled: true });
      case "disableTool":
        const disableName = call.params.name as string;
        if (!disableName) {
          return this.error("Tool name is required");
        }
        await toolRegistryStore.disableTool(disableName);
        return this.success({ toolName: disableName, enabled: false });
      case "getEnabledTools":
        return this.success(this.getEnabledTools());
      default:
        return this.error(`Unknown method: ${call.method}`);
    }
  }

  /**
   * List all tools with their status
   */
  listTools(): Array<{ name: string; enabled: boolean; description: string; shortDescription: string }> {
    const toolsWithStatus = getAllToolsWithStatus();
    
    return toolsWithStatus.map(({ tool, enabled }) => ({
      name: tool.name,
      enabled,
      description: tool.description,
      shortDescription: tool.shortDescription
    }));
  }

  /**
   * Get only enabled tools (for persona)
   */
  getEnabledTools() {
    const toolsWithStatus = getAllToolsWithStatus();
    return toolsWithStatus
      .filter(({ enabled }) => enabled)
      .map(({ tool }) => tool);
  }
}

/**
 * Tool Registry Tool Implementation
 */
class ToolRegistryTool extends AbstractTool {
  readonly name = "tool_registry";
  readonly shortDescription = "Manages and queries the tool registry";
  readonly description = "Manages the enable/disable status of tools and provides tool information for the persona. Use this tool to get a list of available tools with their descriptions for the system prompt.";
  readonly parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list_tools", "get_tools_for_prompt"],
        description: "The action to perform"
      }
    }
  };
  readonly examples = [
    {
      input: { action: "list_tools" },
      output: {
        ok: true,
        data: {
          tools: [
            {
              name: "get_time",
              enabled: true,
              description: "Returns the current server time"
            }
          ]
        }
      },
      description: "List all tools with their status"
    },
    {
      input: { action: "get_tools_for_prompt" },
      output: {
        ok: true,
        data: {
          toolsDescription: "- name: get_time\n  description: Returns the current server time\n  parameters: {}"
        }
      },
      description: "Get formatted tool list for system prompt"
    }
  ];

  private service: ToolRegistryService;

  constructor(service: ToolRegistryService) {
    super();
    this.service = service;
  }

  async execute(args: any, _ctx: ToolContext): Promise<ToolResult> {
    const action = args.action ?? "list_tools";

    if (action === "list_tools") {
      const tools = this.service.listTools();
      return {
        ok: true,
        data: { tools }
      };
    }

    if (action === "get_tools_for_prompt") {
      const enabledTools = this.service.getEnabledTools();
      const toolsDescription = enabledTools
        .map(
          (t) =>
            `- name: ${t.name}\n  description: ${t.description}\n  parameters: ${JSON.stringify(
              t.parameters ?? {}
            )}`
        )
        .join("\n");
      
      return {
        ok: true,
        data: {
          toolsDescription,
          tools: enabledTools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }
      };
    }

    return {
      ok: false,
      error: `Unknown action: ${action}`
    };
  }
}

// Create service and tool instances
const toolRegistryService = new ToolRegistryService();
const toolRegistryTool = new ToolRegistryTool(toolRegistryService);

/**
 * Tool Registry Component
 */
export const toolRegistryComponent: Component = {
  id: "tool-registry",
  name: "Tool Registry Component",
  description: "Manages the enable/disable status of all tools",
  service: toolRegistryService,
  tool: toolRegistryTool,
  async initialize() {
    await toolRegistryService.initialize();
  }
};

