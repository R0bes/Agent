/**
 * Execute Tool Use Case
 * 
 * Executes a tool with given arguments
 */

import type { IToolPort } from "../../../ports/input/IToolPort";
import { ToolContext } from "../../../domain/valueObjects/ToolContext";
import { ToolResult } from "../../../domain/valueObjects/ToolResult";

export class ExecuteToolUseCase {
  constructor(
    private readonly toolPort: IToolPort
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const result = await this.toolPort.executeTool({
      toolName,
      args,
      context
    });

    return new ToolResult(result.ok, result.data, result.error);
  }
}

