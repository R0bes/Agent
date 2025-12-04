import { AbstractTool } from "../../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../../types";

/**
 * Echo Tool Component
 * 
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Echoes back text with context information
 */
class EchoTool extends AbstractTool {
  readonly name = "echo";
  readonly shortDescription = "Echo back the provided text with context information.";
  readonly description = "Echoes back the provided text along with contextual information about the current request. This tool is primarily useful for debugging and testing the tool execution pipeline. It returns the echoed text along with the user ID, conversation ID, and the source kind (e.g., 'gui', 'scheduler', etc.) that initiated the request. Use this tool to verify that tool calls are working correctly and to inspect the execution context.";
  readonly parameters = {
    type: "object",
    properties: {
      text: { type: "string" }
    },
    required: ["text"]
  };
  readonly examples = [
    {
      input: {
        text: "Hello, world!"
      },
      output: {
        ok: true,
        data: {
          echoed: "Hello, world!",
          userId: "user-123",
          conversationId: "conv-456",
          sourceKind: "gui"
        }
      },
      description: "Echo a simple text message"
    },
    {
      input: {
        text: "Test message"
      },
      output: {
        ok: true,
        data: {
          echoed: "Test message",
          userId: "user-789",
          conversationId: "conv-012",
          sourceKind: "scheduler"
        }
      },
      description: "Echo with different context"
    }
  ];

  async execute(args: { text: string }, ctx: ToolContext): Promise<ToolResult> {
    return {
      ok: true,
      data: {
        echoed: args.text,
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        sourceKind: ctx.source.kind
      }
    };
  }
}

// Create singleton instance (auto-registers on construction)
const echoToolInstance = new EchoTool();

/**
 * Echo Tool Component
 */
export const echoToolComponent: Component = {
  id: "echo-tool",
  name: "Echo Tool Component",
  description: "Echoes back text with context information",
  tool: echoToolInstance
};
