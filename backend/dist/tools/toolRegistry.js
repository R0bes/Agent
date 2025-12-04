const tools = new Map();
export function registerTool(tool) {
    if (tools.has(tool.name)) {
        throw new Error(`Tool with name "${tool.name}" already registered`);
    }
    tools.set(tool.name, tool);
}
export function getTool(name) {
    return tools.get(name);
}
export function listTools() {
    return Array.from(tools.values());
}
export function getToolInfo(name) {
    const tool = getTool(name);
    if (!tool) {
        return undefined;
    }
    return {
        name: tool.name,
        shortDescription: tool.shortDescription,
        description: tool.description,
        parameters: tool.parameters,
        examples: tool.examples
    };
}
export function listToolInfos() {
    return listTools().map(tool => ({
        name: tool.name,
        shortDescription: tool.shortDescription,
        description: tool.description,
        parameters: tool.parameters,
        examples: tool.examples
    }));
}
