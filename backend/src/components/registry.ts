/**
 * Component Registry
 * 
 * Central registry for all components in the system.
 * Components can implement Service, Tool, Source or any combination.
 */

import type { Component, ServiceInterface, ToolInterface, SourceInterface, WorkerInterface } from "./types";
import { getAllTools as getBaseTools } from "./base/toolRegistry";
import { logInfo, logDebug, logWarn, logError } from "../utils/logger";
import { toolboxStore } from "./toolbox/toolboxStore";

const components = new Map<string, Component>();

/**
 * Register a component
 */
export function registerComponent(component: Component): void {
  if (components.has(component.id)) {
    logWarn("Component Registry: Component already registered", {
      componentId: component.id
    });
    throw new Error(`Component with id "${component.id}" already registered`);
  }
  
  logDebug("Component Registry: Registering component", {
    componentId: component.id,
    componentName: component.name,
    hasService: !!component.service,
    hasTool: !!component.tool,
    hasSource: !!component.source,
    hasWorker: !!component.worker
  });

  components.set(component.id, component);
  
  // Initialize if needed
  if (component.initialize) {
    logDebug("Component Registry: Initializing component", {
      componentId: component.id
    });
    try {
      component.initialize();
      logInfo("Component Registry: Component initialized", {
        componentId: component.id
      });
    } catch (err) {
      logError("Component Registry: Component initialization failed", err, {
        componentId: component.id
      });
      throw err;
    }
  } else {
    logDebug("Component Registry: Component has no initialize method", {
      componentId: component.id
    });
  }
}

/**
 * Get a component by ID
 */
export function getComponent(id: string): Component | undefined {
  return components.get(id);
}

/**
 * Get all components
 */
export function getAllComponents(): Component[] {
  return Array.from(components.values());
}

/**
 * Get all components that implement Service
 */
export function getServices(): ServiceInterface[] {
  return Array.from(components.values())
    .filter(c => c.service)
    .map(c => c.service!)
    .filter((s): s is ServiceInterface => s !== undefined);
}

/**
 * Get all components that implement Tool
 * Also includes tools registered via AbstractTool base class
 * Filters out disabled tools
 */
export function getTools(): ToolInterface[] {
  const componentTools = Array.from(components.values())
    .filter(c => c.tool)
    .map(c => c.tool!)
    .filter((t): t is ToolInterface => t !== undefined);
  
  // Also get tools from base registry (AbstractTool instances)
  const baseTools = getBaseTools();
  
  // Merge and deduplicate by name
  const toolMap = new Map<string, ToolInterface>();
  for (const tool of [...componentTools, ...baseTools]) {
    if (!toolMap.has(tool.name)) {
      toolMap.set(tool.name, tool);
    }
  }
  
  const allTools = Array.from(toolMap.values());
  
  // Filter out disabled tools (only if toolRegistryStore is initialized)
  // We need to check if store is initialized to avoid errors during startup
  try {
    return allTools.filter(tool => {
      // Skip filtering for toolbox itself to avoid circular dependency
      if (tool.name === "toolbox") {
        return true;
      }
      return toolboxStore.isToolEnabled(tool.name);
    });
  } catch (err) {
    // If store is not initialized yet, return all tools
    logDebug("Component Registry: Tool registry store not initialized, returning all tools");
    return allTools;
  }
}

/**
 * Get all tools with their enable/disable status (for GUI)
 */
export function getAllToolsWithStatus(): Array<{ tool: ToolInterface; enabled: boolean }> {
  const componentTools = Array.from(components.values())
    .filter(c => c.tool)
    .map(c => c.tool!)
    .filter((t): t is ToolInterface => t !== undefined);
  
  const baseTools = getBaseTools();
  
  const toolMap = new Map<string, ToolInterface>();
  for (const tool of [...componentTools, ...baseTools]) {
    if (!toolMap.has(tool.name)) {
      toolMap.set(tool.name, tool);
    }
  }
  
  const allTools = Array.from(toolMap.values());
  
  try {
    return allTools.map(tool => ({
      tool,
      enabled: toolboxStore.isToolEnabled(tool.name)
    }));
  } catch (err) {
    // If store is not initialized, assume all tools are enabled
    return allTools.map(tool => ({
      tool,
      enabled: true
    }));
  }
}

/**
 * Get all components that implement Source
 */
export function getSources(): SourceInterface[] {
  return Array.from(components.values())
    .filter(c => c.source)
    .map(c => c.source!)
    .filter((s): s is SourceInterface => s !== undefined);
}

/**
 * Get a tool by name
 */
export function getToolByName(name: string): ToolInterface | undefined {
  return getTools().find(t => t.name === name);
}

/**
 * Get a source by ID or kind
 */
export function getSourceById(id: string): SourceInterface | undefined {
  return getSources().find(s => s.id === id);
}

export function getSourceByKind(kind: string): SourceInterface | undefined {
  return getSources().find(s => s.kind === kind);
}

/**
 * Shutdown all components
 */
export async function shutdownAll(): Promise<void> {
  logInfo("Component Registry: Shutting down all components", {
    componentCount: components.size
  });

  const componentsToShutdown = Array.from(components.values())
    .filter(c => c.shutdown);

  logDebug("Component Registry: Components to shutdown", {
    count: componentsToShutdown.length,
    componentIds: componentsToShutdown.map(c => c.id)
  });

  const shutdownPromises = componentsToShutdown.map(async (c) => {
    try {
      logDebug("Component Registry: Shutting down component", {
        componentId: c.id
      });
      await c.shutdown!();
      logInfo("Component Registry: Component shut down", {
        componentId: c.id
      });
    } catch (err) {
      logError("Component Registry: Component shutdown failed", err, {
        componentId: c.id
      });
    }
  });
  
  await Promise.all(shutdownPromises);
  logInfo("Component Registry: All components shut down");
}

