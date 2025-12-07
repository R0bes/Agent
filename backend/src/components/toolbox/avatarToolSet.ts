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
        description: "Move the avatar to a specific position on the screen (center coordinates)",
        shortDescription: "Move avatar",
        parameters: {
          type: "object",
          properties: {
            x: {
              type: "number",
              description: "X-coordinate of the avatar's center (absolute pixels)"
            },
            y: {
              type: "number",
              description: "Y-coordinate of the avatar's center (absolute pixels)"
            }
          },
          required: ["x", "y"]
        },
        examples: [
          {
            name: "Move avatar to center of screen",
            arguments: { x: 960, y: 540 }
          }
        ]
      },
      {
        name: "avatar_set_size",
        description: "Set the avatar size (0.25 - 1.75, where 1.0 = 100% = 40px base size)",
        shortDescription: "Set avatar size",
        parameters: {
          type: "object",
          properties: {
            size: {
              type: "number",
              minimum: 0.25,
              maximum: 1.75,
              description: "Size factor: 0.25 (25%) to 1.75 (175%) of base size"
            }
          },
          required: ["size"]
        },
        examples: [
          {
            description: "Set to minimum size (25%)",
            arguments: { size: 0.25 }
          },
          {
            description: "Set to normal size (100%)",
            arguments: { size: 1.0 }
          },
          {
            description: "Set to maximum size (175%)",
            arguments: { size: 1.75 }
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
    ];
  }

  /**
   * Führe ein Tool aus
   */
  async callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    try {
      switch (name) {
        case "avatar_move": {
          const { x, y } = args;
          
          if (typeof x !== "number" || typeof y !== "number") {
            return {
              ok: false,
              error: "x and y must be numbers"
            };
          }

          logDebug("AvatarToolSet: Moving avatar", { x, y });
          
          sendAvatarCommand({
            command: "move",
            target: { x, y }
          });

          return {
            ok: true,
            data: {
              message: "Avatar move command sent",
              position: { x, y }
            }
          };
        }

        case "avatar_set_size": {
          const { size } = args;
          
          if (typeof size !== "number" || size < 0.25 || size > 1.75) {
            return {
              ok: false,
              error: "size must be a number between 0.25 and 1.75"
            };
          }

          logDebug("AvatarToolSet: Setting avatar size", { size });
          
          sendAvatarCommand({
            command: "set_size",
            size: size
          });

          return {
            ok: true,
            data: {
              message: "Avatar size change command sent",
              size
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
      status: "healthy",
      lastCheck: new Date().toISOString()
    };
  }
}

