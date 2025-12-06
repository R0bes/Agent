import { AbstractTool } from "../../base/AbstractTool";
import type { ToolContext, ToolResult } from "../toolTypes";
import { eventBus } from "../../../events/eventBus";
import { logInfo, logDebug, logError } from "../../../utils/logger";

interface GuiActionPayload {
  action: string;
  requestId?: string;
  [key: string]: any;
}

// Map to store pending requests for bidirectional actions
const pendingRequests = new Map<string, {
  resolve: (value: ToolResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

// Timeout for bidirectional requests (10 seconds)
const REQUEST_TIMEOUT = 10000;

export class GuiControlTool extends AbstractTool {
  readonly name = "gui_control";
  readonly shortDescription = "Control the GUI interface and avatar";
  readonly description = `Allows the AI to interact with the GUI: move avatar, open/close panels, show animations, take screenshots, and query GUI state.

Actions:
- move_avatar: Move avatar to a position or element (with optional emotion and panel opening)
- show_emotion: Display emotion animation (happy, thinking, attentive, confused, excited)
- open_panel / close_panel: Control panels (logs, memory, workers, toolbox, scheduler, settings, conversation)
- highlight_element: Highlight an element temporarily
- show_notification: Show a notification message
- take_screenshot: Take a screenshot (bidirectional - returns base64 image)
- get_element_info: Get information about an element (bidirectional)
- get_panel_status: Get status of all panels (bidirectional)
- get_avatar_position: Get current avatar position in relative coordinates (0-1) (bidirectional)
- minimize_to_status_led: Minimize avatar to small status LED in top-left corner
- restore_from_status_led: Restore avatar from status LED to previous position`;

  readonly parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "move_avatar",
          "show_emotion",
          "open_panel",
          "close_panel",
          "highlight_element",
          "show_notification",
          "take_screenshot",
          "get_element_info",
          "get_panel_status",
          "get_avatar_position",
          "minimize_to_status_led",
          "restore_from_status_led"
        ],
        description: "The action to perform"
      },
      // For move_avatar
      position: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        },
        description: "Absolute position to move avatar to"
      },
      targetSelector: {
        type: "string",
        description: "CSS selector for element to move avatar to"
      },
      emotion: {
        type: "string",
        enum: ["happy", "thinking", "attentive", "confused", "excited"],
        description: "Emotion to display"
      },
      panel: {
        type: "string",
        enum: ["logs", "memory", "workers", "toolbox", "scheduler", "settings", "conversation"],
        description: "Panel to open/close"
      },
      // For show_emotion
      duration: {
        type: "number",
        description: "Duration in milliseconds for emotion animation"
      },
      // For highlight_element
      elementId: {
        type: "string",
        description: "ID of element to highlight"
      },
      selector: {
        type: "string",
        description: "CSS selector for element"
      },
      // For show_notification
      message: {
        type: "string",
        description: "Notification message"
      },
      level: {
        type: "string",
        enum: ["info", "success", "warning", "error"],
        description: "Notification level"
      },
      // For take_screenshot
      fullPage: {
        type: "boolean",
        description: "Take full page screenshot (default: false)"
      }
    },
    required: ["action"]
  };

  readonly examples = [
    {
      input: {
        action: "move_avatar",
        targetSelector: ".logs-panel-morph",
        emotion: "attentive",
        panel: "logs"
      },
      output: {
        ok: true,
        data: { position: { x: 100, y: 200 } }
      },
      description: "Move avatar to logs button and open logs panel"
    },
    {
      input: {
        action: "take_screenshot"
      },
      output: {
        ok: true,
        data: { screenshot: "data:image/png;base64,..." }
      },
      description: "Take a screenshot of the current viewport"
    },
    {
      input: {
        action: "get_panel_status"
      },
      output: {
        ok: true,
        data: {
          logs: false,
          memory: true,
          workers: false,
          toolbox: false,
          scheduler: false,
          settings: false,
          conversation: false
        }
      },
      description: "Get status of all panels"
    },
    {
      input: {
        action: "get_avatar_position"
      },
      output: {
        ok: true,
        data: {
          absolute: { x: 500, y: 300 },
          relative: { x: 0.5, y: 0.3 },
          viewport: { width: 1920, height: 1080 }
        }
      },
      description: "Get current avatar position in relative coordinates (0-1)"
    },
    {
      input: {
        action: "minimize_to_status_led"
      },
      output: {
        ok: true,
        data: { minimized: true }
      },
      description: "Minimize avatar to small status LED in top-left corner"
    },
    {
      input: {
        action: "restore_from_status_led"
      },
      output: {
        ok: true,
        data: { minimized: false }
      },
      description: "Restore avatar from status LED to previous position"
    }
  ];

  async execute(args: any, ctx: ToolContext): Promise<ToolResult> {
    const { action, ...restArgs } = args;

    if (!action) {
      return {
        ok: false,
        error: "Missing required parameter: action"
      };
    }

    // Check if action is bidirectional
    const bidirectionalActions = ["take_screenshot", "get_element_info", "get_panel_status", "get_avatar_position"];
    const isBidirectional = bidirectionalActions.includes(action);

    if (isBidirectional) {
      // Generate request ID
      const requestId = `gui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return new Promise<ToolResult>((resolve, reject) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          pendingRequests.delete(requestId);
          reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
        }, REQUEST_TIMEOUT);

        // Store request
        pendingRequests.set(requestId, {
          resolve: (result: ToolResult) => {
            clearTimeout(timeout);
            pendingRequests.delete(requestId);
            resolve(result);
          },
          reject: (error: Error) => {
            clearTimeout(timeout);
            pendingRequests.delete(requestId);
            reject(error);
          },
          timeout
        });

        // Send action to frontend
        try {
          eventBus.emit({
            type: "gui_action" as any, // Will be added to EventType
            payload: {
              action,
              requestId,
              ...restArgs
            }
          } as any);

          logDebug("GuiControlTool: Sent bidirectional action", {
            action,
            requestId,
            userId: ctx.userId
          });
        } catch (err) {
          clearTimeout(timeout);
          pendingRequests.delete(requestId);
          logError("GuiControlTool: Failed to send action", err as Error, {
            action,
            requestId
          });
          reject(err as Error);
        }
      }).catch((error) => {
        return {
          ok: false,
          error: error.message || String(error)
        };
      });
    } else {
      // Unidirectional action - just send and return success
      try {
        await eventBus.emit({
          type: "gui_action" as any,
          payload: {
            action,
            ...restArgs
          }
        } as any);

        logDebug("GuiControlTool: Sent unidirectional action", {
          action,
          userId: ctx.userId
        });

        return {
          ok: true,
          data: { message: `Action ${action} executed` }
        };
      } catch (err) {
        logError("GuiControlTool: Failed to send action", err as Error, {
          action
        });
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
  }

  /**
   * Handle response from frontend (called by server.ts)
   */
  static handleResponse(requestId: string, result: ToolResult): void {
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(result);
    } else {
      logDebug("GuiControlTool: Received response for unknown request", { requestId });
    }
  }
}

// Export singleton instance
export const guiControlTool = new GuiControlTool();

// Export as component
import type { Component } from "../../types";

export const guiControlToolComponent: Component = {
  id: "gui-control-tool",
  name: "GUI Control Tool Component",
  description: "Allows AI to control GUI and avatar",
  tool: guiControlTool
};

