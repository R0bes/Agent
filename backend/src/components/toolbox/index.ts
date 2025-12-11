/**
 * Toolbox Component
 * 
 * Manages all ToolSets (SystemToolSet, InternalToolSet, ExternalToolSet).
 * Registry aller ToolSets.
 * Event-basierte Tool Execution über Worker Engine.
 */

import type { Component } from "../types";

// Export service class for Execution Service registration
export { ThreadedToolboxService } from "./toolboxService";

// Legacy Component export (for compatibility during migration)
export const toolboxComponent: Component = {
  id: "toolbox",
  name: "Toolbox Component",
  description: "Manages all tool sets (System, Internal, External)",
  service: null as any, // Will be set by Execution Service
  async initialize() {
    // Initialization handled by Execution Service
  }
};

// Export types
export type { ToolSet } from "./toolSet";
export type { SystemToolSet } from "./systemToolSet";
export type { InternalToolSet } from "./internalToolSet";
export type { ExternalToolSet } from "./externalToolSet";
