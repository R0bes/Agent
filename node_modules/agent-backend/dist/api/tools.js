import { getTools, getToolByName } from "../components/registry";
import { logInfo, logDebug, logWarn } from "../utils/logger";
export async function registerToolsRoutes(app) {
    // Get all tools with their information
    app.get("/api/tools", async (req, reply) => {
        logDebug("Tools API: List tools request", {
            requestId: req.id
        });
        const tools = getTools().map(tool => ({
            name: tool.name,
            shortDescription: tool.shortDescription,
            description: tool.description,
            parameters: tool.parameters,
            examples: tool.examples
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
}
