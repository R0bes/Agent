/**
 * ToolboxToolSet
 * 
 * Die Toolbox selbst als SystemToolSet.
 * Tool-Registry als ToolSet.
 * 
 * Bietet Tools:
 * - list_toolsets
 * - enable_toolset
 * - disable_toolset
 * - get_toolset_status
 */

import { SystemToolSet } from "./systemToolSet";
import type { ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { logInfo, logDebug, logError } from "../../utils/logger";

/**
 * ToolboxToolSet - Die Toolbox selbst als SystemToolSet
 * 
 * Registriert sich automatisch beim Systemstart.
 * Bietet Tools zur Verwaltung von ToolSets.
 */
export class ToolboxToolSet extends SystemToolSet {
  readonly id = "toolbox";
  readonly name = "Toolbox";

  private toolboxService: any; // Wird später vom ToolboxService gesetzt

  constructor() {
    super();
  }

  /**
   * Setze Toolbox Service Referenz
   */
  setToolboxService(service: any): void {
    this.toolboxService = service;
  }

  /**
   * Liste aller Tools in diesem ToolSet
   */
  async listTools(): Promise<ToolDescriptor[]> {
    return [
      {
        name: "list_toolsets",
        description: "List all available tool sets with their status",
        shortDescription: "List all tool sets",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "enable_toolset",
        description: "Enable a tool set",
        shortDescription: "Enable a tool set",
        parameters: {
          type: "object",
          properties: {
            toolSetId: {
              type: "string",
              description: "ID of the tool set to enable"
            }
          },
          required: ["toolSetId"]
        }
      },
      {
        name: "disable_toolset",
        description: "Disable a tool set",
        shortDescription: "Disable a tool set",
        parameters: {
          type: "object",
          properties: {
            toolSetId: {
              type: "string",
              description: "ID of the tool set to disable"
            }
          },
          required: ["toolSetId"]
        }
      },
      {
        name: "get_toolset_status",
        description: "Get status of a specific tool set",
        shortDescription: "Get tool set status",
        parameters: {
          type: "object",
          properties: {
            toolSetId: {
              type: "string",
              description: "ID of the tool set"
            }
          },
          required: ["toolSetId"]
        }
      }
    ];
  }

  /**
   * Führe ein Tool aus
   */
  async callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    if (!this.toolboxService) {
      return {
        ok: false,
        error: "Toolbox service not initialized"
      };
    }

    try {
      switch (name) {
        case "list_toolsets":
          const toolSets = await this.toolboxService.getAllToolSets();
          return {
            ok: true,
            data: { toolSets }
          };

        case "enable_toolset":
          const enableId = args.toolSetId;
          if (!enableId) {
            return {
              ok: false,
              error: "toolSetId is required"
            };
          }
          await this.toolboxService.enableToolSet(enableId);
          return {
            ok: true,
            data: { toolSetId: enableId, enabled: true }
          };

        case "disable_toolset":
          const disableId = args.toolSetId;
          if (!disableId) {
            return {
              ok: false,
              error: "toolSetId is required"
            };
          }
          await this.toolboxService.disableToolSet(disableId);
          return {
            ok: true,
            data: { toolSetId: disableId, enabled: false }
          };

        case "get_toolset_status":
          const statusId = args.toolSetId;
          if (!statusId) {
            return {
              ok: false,
              error: "toolSetId is required"
            };
          }
          const status = await this.toolboxService.getToolSetStatus(statusId);
          return {
            ok: true,
            data: { toolSetId: statusId, status }
          };

        default:
          return {
            ok: false,
            error: `Unknown tool: ${name}`
          };
      }
    } catch (err) {
      logError("ToolboxToolSet: Tool execution failed", err, {
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
   * Health Check
   */
  async checkHealth(): Promise<HealthStatus> {
    // Toolbox ist immer healthy wenn sie läuft
    return {
      status: "healthy",
      lastCheck: new Date().toISOString()
    };
  }
}

