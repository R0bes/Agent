import { getToolByName, getAllToolsWithStatus } from "../components/registry";
import { toolRegistryStore } from "../components/toolRegistry/toolRegistryStore";
import { logInfo, logDebug, logWarn, logError } from "../utils/logger";
export async function registerToolsRoutes(app) {
    // Get all tools with their information and status (for GUI)
    app.get("/api/tools", async (req, reply) => {
        logDebug("Tools API: List tools request", {
            requestId: req.id
        });
        const toolsWithStatus = getAllToolsWithStatus();
        const tools = toolsWithStatus.map(({ tool, enabled }) => ({
            name: tool.name,
            shortDescription: tool.shortDescription,
            description: tool.description,
            parameters: tool.parameters,
            examples: tool.examples,
            enabled
        }));
        logInfo("Tools API: Tools list retrieved", {
            toolCount: tools.length,
            requestId: req.id
        });
        return reply.send({ ok: true, data: tools });
    });
    // Get a specific tool by name
    app.get("/api/tools/:name", async (req, reply) => {
        const { name } = req.params;
        logDebug("Tools API: Get tool request", {
            toolName: name,
            requestId: req.id
        });
        const tool = getToolByName(name);
        if (!tool) {
            logWarn("Tools API: Tool not found", {
                toolName: name,
                requestId: req.id
            });
            return reply.status(404).send({
                ok: false,
                error: `Tool "${name}" not found`
            });
        }
        logInfo("Tools API: Tool retrieved", {
            toolName: name,
            requestId: req.id
        });
        return reply.send({
            ok: true,
            data: {
                name: tool.name,
                shortDescription: tool.shortDescription,
                description: tool.description,
                parameters: tool.parameters,
                examples: tool.examples
            }
        });
    });
    // Enable a tool
    app.post("/api/tools/:name/enable", async (req, reply) => {
        const { name } = req.params;
        logDebug("Tools API: Enable tool request", {
            toolName: name,
            requestId: req.id
        });
        const tool = getToolByName(name);
        if (!tool) {
            logWarn("Tools API: Tool not found for enable", {
                toolName: name,
                requestId: req.id
            });
            return reply.status(404).send({
                ok: false,
                error: `Tool "${name}" not found`
            });
        }
        try {
            await toolRegistryStore.enableTool(name);
            logInfo("Tools API: Tool enabled", {
                toolName: name,
                requestId: req.id
            });
            return reply.send({
                ok: true,
                data: { toolName: name, enabled: true }
            });
        }
        catch (err) {
            logError("Tools API: Failed to enable tool", err, {
                toolName: name,
                requestId: req.id
            });
            return reply.status(500).send({
                ok: false,
                error: "Failed to enable tool"
            });
        }
    });
    // Disable a tool
    app.post("/api/tools/:name/disable", async (req, reply) => {
        const { name } = req.params;
        logDebug("Tools API: Disable tool request", {
            toolName: name,
            requestId: req.id
        });
        const tool = getToolByName(name);
        if (!tool) {
            logWarn("Tools API: Tool not found for disable", {
                toolName: name,
                requestId: req.id
            });
            return reply.status(404).send({
                ok: false,
                error: `Tool "${name}" not found`
            });
        }
        // Don't allow disabling the tool_registry itself
        if (name === "tool_registry") {
            logWarn("Tools API: Cannot disable tool_registry", {
                requestId: req.id
            });
            return reply.status(400).send({
                ok: false,
                error: "Cannot disable the tool_registry tool"
            });
        }
        try {
            await toolRegistryStore.disableTool(name);
            logInfo("Tools API: Tool disabled", {
                toolName: name,
                requestId: req.id
            });
            return reply.send({
                ok: true,
                data: { toolName: name, enabled: false }
            });
        }
        catch (err) {
            logError("Tools API: Failed to disable tool", err, {
                toolName: name,
                requestId: req.id
            });
            return reply.status(500).send({
                ok: false,
                error: "Failed to disable tool"
            });
        }
    });
}
