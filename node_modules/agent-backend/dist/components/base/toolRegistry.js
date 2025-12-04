/**
 * Tool Registry for Abstract Tools
 *
 * This registry is used by AbstractTool to automatically register tools
 */
import { logInfo, logWarn } from "../../utils/logger";
const tools = new Map();
/**
 * Register a tool (called automatically by AbstractTool constructor)
 */
export function registerTool(tool) {
    if (tools.has(tool.name)) {
        logWarn("Tool Registry: Tool already registered", {
            toolName: tool.name
        });
        throw new Error(`Tool with name "${tool.name}" already registered`);
    }
    tools.set(tool.name, tool);
    logInfo("Tool Registry: Tool registered", {
        toolName: tool.name,
        totalTools: tools.size
    });
}
/**
 * Get a tool by name
 */
export function getTool(name) {
    return tools.get(name);
}
/**
 * Get all registered tools
 */
export function getAllTools() {
    return Array.from(tools.values());
}
