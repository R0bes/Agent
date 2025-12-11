/**
 * List Tools Use Case
 * 
 * Lists all available tools
 */

import type { IToolPort } from "../../../ports/input/IToolPort";
import { Tool } from "../../../domain/entities/Tool";

export class ListToolsUseCase {
  constructor(
    private readonly toolPort: IToolPort
  ) {}

  async execute(): Promise<Tool[]> {
    const tools = await this.toolPort.listTools();

    return tools.map(tool => new Tool(
      tool.name,
      tool.shortDescription,
      tool.description,
      tool.parameters,
      tool.examples
    ));
  }
}

