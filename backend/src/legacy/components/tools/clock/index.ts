import { AbstractTool } from "../../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../../types";

/**
 * Clock Tool Component
 * 
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Returns current server time
 */
class ClockTool extends AbstractTool {
  readonly name = "get_time";
  readonly shortDescription = "Get the current server time in ISO format.";
  readonly description = "Returns the current server time in ISO 8601 format (e.g., '2024-01-15T10:30:00.000Z'). This tool is useful when you need to know the current date and time, for example to schedule tasks, log timestamps, or provide time-sensitive information to users. The time is always returned in UTC timezone.";
  readonly parameters = {
    type: "object",
    properties: {},
    additionalProperties: false
  };
  readonly examples = [
    {
      input: {},
      output: {
        ok: true,
        data: {
          now: "2024-01-15T10:30:00.000Z"
        }
      },
      description: "Basic usage to get current time"
    }
  ];

  async execute(_args: any, _ctx: ToolContext): Promise<ToolResult> {
    return {
      ok: true,
      data: {
        now: new Date().toISOString()
      }
    };
  }
}

// Create singleton instance (auto-registers on construction)
const clockToolInstance = new ClockTool();

/**
 * Clock Tool Component
 */
export const clockToolComponent: Component = {
  id: "clock-tool",
  name: "Clock Tool Component",
  description: "Returns current server time",
  tool: clockToolInstance
};

