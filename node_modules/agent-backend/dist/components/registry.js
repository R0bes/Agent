/**
 * Component Registry
 *
 * Central registry for all components in the system.
 * Components can implement Service, Tool, Source or any combination.
 */
import { getAllTools as getBaseTools } from "./base/toolRegistry";
import { logInfo, logDebug, logWarn, logError } from "../utils/logger";
const components = new Map();
/**
 * Register a component
 */
export function registerComponent(component) {
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
        hasSource: !!component.source
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
        }
        catch (err) {
            logError("Component Registry: Component initialization failed", err, {
                componentId: component.id
            });
            throw err;
        }
    }
    else {
        logDebug("Component Registry: Component has no initialize method", {
            componentId: component.id
        });
    }
}
/**
 * Get a component by ID
 */
export function getComponent(id) {
    return components.get(id);
}
/**
 * Get all components
 */
export function getAllComponents() {
    return Array.from(components.values());
}
/**
 * Get all components that implement Service
 */
export function getServices() {
    return Array.from(components.values())
        .filter(c => c.service)
        .map(c => c.service)
        .filter((s) => s !== undefined);
}
/**
 * Get all components that implement Tool
 * Also includes tools registered via AbstractTool base class
 */
export function getTools() {
    const componentTools = Array.from(components.values())
        .filter(c => c.tool)
        .map(c => c.tool)
        .filter((t) => t !== undefined);
    // Also get tools from base registry (AbstractTool instances)
    const baseTools = getBaseTools();
    // Merge and deduplicate by name
    const toolMap = new Map();
    for (const tool of [...componentTools, ...baseTools]) {
        if (!toolMap.has(tool.name)) {
            toolMap.set(tool.name, tool);
        }
    }
    return Array.from(toolMap.values());
}
/**
 * Get all components that implement Source
 */
export function getSources() {
    return Array.from(components.values())
        .filter(c => c.source)
        .map(c => c.source)
        .filter((s) => s !== undefined);
}
/**
 * Get a tool by name
 */
export function getToolByName(name) {
    return getTools().find(t => t.name === name);
}
/**
 * Get a source by ID or kind
 */
export function getSourceById(id) {
    return getSources().find(s => s.id === id);
}
export function getSourceByKind(kind) {
    return getSources().find(s => s.kind === kind);
}
/**
 * Shutdown all components
 */
export async function shutdownAll() {
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
            await c.shutdown();
            logInfo("Component Registry: Component shut down", {
                componentId: c.id
            });
        }
        catch (err) {
            logError("Component Registry: Component shutdown failed", err, {
                componentId: c.id
            });
        }
    });
    await Promise.all(shutdownPromises);
    logInfo("Component Registry: All components shut down");
}
