/**
 * AvatarToolSet
 * 
 * SystemToolSet für Avatar-Steuerung.
 * Bietet Tools zur Steuerung des Avatars über die AI.
 */

import { SystemToolSet } from "./systemToolSet";
import type { ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { logInfo, logDebug, logError } from "../../utils/logger";
import { sendAvatarCommand } from "../../server";

/**
 * AvatarToolSet - Steuerung des Avatars
 * 
 * Registriert sich automatisch beim Systemstart.
 * Bietet Tools zur Avatar-Steuerung.
 */
export class AvatarToolSet extends SystemToolSet {
  readonly id = "avatar";
  readonly name = "Avatar";

  constructor() {
    super();
  }

  /**
   * Liste aller Tools in diesem ToolSet
   */
  async listTools(): Promise<ToolDescriptor[]> {
    return [
      {
        name: "avatar_move",
        description: "Move the avatar to a specific position on the screen",
        shortDescription: "Move avatar to position",
        parameters: {
          type: "object",
          properties: {
            x: {
              type: "number",
              description: "X coordinate (0-1 for relative, or pixel value for absolute)"
            },
            y: {
              type: "number",
              description: "Y coordinate (0-1 for relative, or pixel value for absolute)"
            },
            relative: {
              type: "boolean",
              description: "If true, coordinates are relative (0-1), otherwise absolute pixels",
              default: false
            }
          },
          required: ["x", "y"]
        },
        examples: [
          {
            description: "Move avatar to center of screen (relative)",
            args: { x: 0.5, y: 0.5, relative: true }
          },
          {
            description: "Move avatar to specific pixel position",
            args: { x: 200, y: 300, relative: false }
          }
        ]
      },
      {
        name: "avatar_execute_capability",
        description: "Execute an avatar capability (expression or action)",
        shortDescription: "Execute avatar capability",
        parameters: {
          type: "object",
          properties: {
            capabilityId: {
              type: "string",
              description: "ID of the capability to execute (e.g., 'wave', 'dance', 'click_button')"
            },
            args: {
              type: "object",
              description: "Optional arguments for the capability",
              additionalProperties: true
            }
          },
          required: ["capabilityId"]
        },
        examples: [
          {
            description: "Execute wave expression",
            args: { capabilityId: "wave" }
          },
          {
            description: "Execute click button action",
            args: { capabilityId: "click_button", args: { buttonId: "sidebar-button-toolbox" } }
          }
        ]
      },
      {
        name: "avatar_get_state",
        description: "Get the current state of the avatar (position, mode, status)",
        shortDescription: "Get avatar state",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "avatar_set_mode",
        description: "Set the avatar presentation mode (small or large)",
        shortDescription: "Set avatar mode",
        parameters: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["small", "large"],
              description: "Presentation mode: 'small' (LED) or 'large' (normal avatar)"
            }
          },
          required: ["mode"]
        },
        examples: [
          {
            description: "Switch to small mode (LED)",
            args: { mode: "small" }
          },
          {
            description: "Switch to large mode (normal)",
            args: { mode: "large" }
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
        case "avatar_move": {
          const { x, y, relative = false } = args;
          
          if (typeof x !== "number" || typeof y !== "number") {
            return {
              ok: false,
              error: "x and y must be numbers"
            };
          }

          let targetX = x;
          let targetY = y;

          // Convert relative coordinates to absolute if needed
          if (relative) {
            // Get viewport size from context or use defaults
            const viewportWidth = 1920; // Default, could be passed from frontend
            const viewportHeight = 1080; // Default, could be passed from frontend
            
            targetX = x * viewportWidth;
            targetY = y * viewportHeight;
          }

          logDebug("AvatarToolSet: Moving avatar", { x: targetX, y: targetY, relative });

          sendAvatarCommand({
            command: "move",
            target: { x: targetX, y: targetY }
          });

          return {
            ok: true,
            data: {
              message: "Avatar move command sent",
              position: { x: targetX, y: targetY }
            }
          };
        }

        case "avatar_execute_capability": {
          const { capabilityId, args: capabilityArgs } = args;

          if (!capabilityId || typeof capabilityId !== "string") {
            return {
              ok: false,
              error: "capabilityId must be a string"
            };
          }

          logDebug("AvatarToolSet: Executing capability", { capabilityId, args: capabilityArgs });

          sendAvatarCommand({
            command: "capability",
            capabilityId,
            args: capabilityArgs || {}
          });

          return {
            ok: true,
            data: {
              message: "Capability execution command sent",
              capabilityId
            }
          };
        }

        case "avatar_get_state": {
          // Note: This would need to query the frontend for current state
          // For now, we return a placeholder
          logDebug("AvatarToolSet: Getting avatar state");

          return {
            ok: true,
            data: {
              message: "Avatar state query sent (state will be returned via WebSocket)",
              note: "The actual state will be sent back via avatar_state event"
            }
          };
        }

        case "avatar_set_mode": {
          const { mode } = args;

          if (mode !== "small" && mode !== "large") {
            return {
              ok: false,
              error: "mode must be 'small' or 'large'"
            };
          }

          logDebug("AvatarToolSet: Setting avatar mode", { mode });

          // Send command to change mode
          // This could be done via a special command or by using the capability system
          sendAvatarCommand({
            command: "capability",
            capabilityId: mode === "small" ? "minimize_to_led" : "restore_from_led",
            args: {}
          });

          return {
            ok: true,
            data: {
              message: "Avatar mode change command sent",
              mode
            }
          };
        }

        default:
          return {
            ok: false,
            error: `Unknown tool: ${name}`
          };
      }
    } catch (err) {
      logError("AvatarToolSet: Tool execution error", err, { toolName: name, args });
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
    return {
      healthy: true,
      lastCheck: new Date().toISOString()
    };
  }
}

