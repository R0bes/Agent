/**
 * Persona Component
 *
 * Implements Service interface using AbstractService base class.
 * - Service: Core persona service that processes messages and coordinates with tools
 */
import { AbstractService } from "../base/AbstractService";
import { eventBus } from "../../events/eventBus";
import { createDemoJob, updateJobStatus, listJobs } from "../../models/jobStore";
import { addMemoryForUser, listMemoriesForUser } from "../../models/memoryStore";
import { toolEngine } from "../../tools/toolEngine";
import { getTools } from "../registry";
import { ollamaChat } from "../../llm/ollamaClient";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";
let messageCounter = 0;
/**
 * Persona Service implementation
 */
class PersonaService extends AbstractService {
    constructor() {
        super(...arguments);
        this.id = "persona-service";
        this.name = "Persona Service";
        this.description = "Core persona service that processes messages and coordinates with tools";
    }
    async onInitialize() {
        logInfo("Persona Service: Initialized");
    }
    async handleCall(call) {
        if (call.method === "processMessage") {
            try {
                const sourceMessage = call.params.sourceMessage;
                const reply = await handleSourceMessage(sourceMessage);
                return this.success(reply);
            }
            catch (err) {
                return this.error(err?.message ?? String(err));
            }
        }
        return this.error(`Unknown method: ${call.method}`);
    }
}
/**
 * Entry point for processing source messages.
 * This is called by sources (e.g., GUI adapter) to process user messages.
 */
export async function handleSourceMessage(srcMsg) {
    logInfo("Persona: Processing source message", {
        messageId: srcMsg.id,
        userId: srcMsg.userId,
        conversationId: srcMsg.conversationId,
        sourceKind: srcMsg.source.kind,
        contentLength: srcMsg.content.length
    });
    const startTime = Date.now();
    const assistantContent = await runPersonaForSourceMessage(srcMsg);
    const processingDuration = Date.now() - startTime;
    messageCounter += 1;
    const reply = {
        id: `msg-${messageCounter}`,
        conversationId: srcMsg.conversationId,
        role: "assistant",
        content: assistantContent,
        createdAt: new Date().toISOString()
    };
    logInfo("Persona: Assistant message generated", {
        messageId: reply.id,
        userId: srcMsg.userId,
        conversationId: srcMsg.conversationId,
        contentLength: assistantContent.length,
        processingDuration: `${processingDuration}ms`
    });
    // --- demo job + memory logic (unchanged, still useful for the UI) ---
    const jobLabel = `Process message: "${srcMsg.content.slice(0, 32)}${srcMsg.content.length > 32 ? "…" : ""}"`;
    const job = createDemoJob(jobLabel, "tool");
    logDebug("Persona: Demo job created", {
        jobId: job.id,
        jobLabel,
        userId: srcMsg.userId
    });
    await eventBus.emit({
        type: "job_updated",
        payload: { jobs: listJobs() }
    });
    setTimeout(async () => {
        updateJobStatus(job.id, "running");
        await eventBus.emit({
            type: "job_updated",
            payload: { jobs: listJobs() }
        });
    }, 500);
    setTimeout(async () => {
        updateJobStatus(job.id, "done");
        await eventBus.emit({
            type: "job_updated",
            payload: { jobs: listJobs() }
        });
    }, 1500);
    await addMemoryForUser(srcMsg.userId, "Recent message summary", `User said: "${srcMsg.content.slice(0, 80)}${srcMsg.content.length > 80 ? "…" : ""}".`);
    await eventBus.emit({
        type: "memory_updated",
        payload: { userId: srcMsg.userId, memories: await listMemoriesForUser(srcMsg.userId) }
    });
    return reply;
}
/**
 * Simple tool-aware persona core:
 *
 * 1. Builds a list of tools and passes it to LLM
 * 2. Asks LLM to respond with a JSON plan:
 *    { "type": "final", "content": "..." }
 *    or
 *    { "type": "tool_call", "tool": "toolName", "args": { ... } }
 * 3. If a tool_call is requested:
 *    - executes the tool via ToolEngine
 *    - makes a second LLM call to turn tool result into a nice answer
 * 4. On any error or malformed JSON, falls back to a plain single-turn answer.
 */
async function runPersonaForSourceMessage(src) {
    logDebug("Persona: Starting message processing", {
        messageId: src.id,
        userId: src.userId,
        conversationId: src.conversationId
    });
    const systemBase = "You are a helpful personal assistant. " +
        "You can optionally use tools to help answer the user's request. " +
        "You are being called from different sources (gui, scheduler, messaging apps).";
    // Get tools from component registry
    const availableTools = getTools();
    logDebug("Persona: Available tools retrieved", {
        toolCount: availableTools.length,
        toolNames: availableTools.map(t => t.name)
    });
    const toolsDescription = availableTools
        .map((t) => `- name: ${t.name}\n  description: ${t.description}\n  parameters: ${JSON.stringify(t.parameters ?? {})}`)
        .join("\n");
    const plannerSystemPrompt = systemBase +
        "\n\nYou have access to the following tools:\n" +
        toolsDescription +
        "\n\nWhen the user asks something, decide if you need a tool. " +
        "Always respond with **pure JSON**, no extra text. " +
        "Use exactly one of these shapes:\n" +
        '{ "type": "final", "content": "<final natural language answer>" }\n' +
        '{ "type": "tool_call", "tool": "<tool name>", "args": { ... } }';
    const toolCtx = {
        userId: src.userId,
        conversationId: src.conversationId,
        source: src.source,
        meta: {}
    };
    // Step 1: ask LLM for a plan (tool or final)
    try {
        logDebug("Persona: Requesting plan from LLM", {
            messageId: src.id,
            userId: src.userId
        });
        const planStartTime = Date.now();
        const planResponse = await ollamaChat([
            { role: "system", content: plannerSystemPrompt },
            {
                role: "user",
                content: `User message: ${src.content}`
            }
        ]);
        const planDuration = Date.now() - planStartTime;
        logInfo("Persona: LLM plan response received", {
            messageId: src.id,
            userId: src.userId,
            duration: `${planDuration}ms`,
            responseLength: planResponse.message.content.length
        });
        const raw = planResponse.message.content.trim();
        let plan = null;
        try {
            plan = JSON.parse(raw);
            logDebug("Persona: Plan parsed successfully", {
                messageId: src.id,
                planType: plan.type
            });
        }
        catch {
            logWarn("Persona: Failed to parse plan JSON, falling back to plain chat", {
                messageId: src.id,
                rawResponse: raw.slice(0, 100)
            });
            // Not valid JSON -> fall back to plain chat
            return await plainChatFallback(systemBase, src.content);
        }
        if (!plan || typeof plan !== "object" || !("type" in plan)) {
            return await plainChatFallback(systemBase, src.content);
        }
        if (plan.type === "final") {
            logInfo("Persona: Plan type is final, returning content", {
                messageId: src.id,
                contentLength: plan.content.length
            });
            return plan.content;
        }
        if (plan.type === "tool_call") {
            logInfo("Persona: Plan type is tool_call, executing tool", {
                messageId: src.id,
                toolName: plan.tool,
                toolArgs: JSON.stringify(plan.args ?? {})
            });
            const toolStartTime = Date.now();
            const result = await toolEngine.execute({ name: plan.tool, args: plan.args ?? {} }, toolCtx);
            const toolDuration = Date.now() - toolStartTime;
            logInfo("Persona: Tool execution completed", {
                messageId: src.id,
                toolName: plan.tool,
                toolSuccess: result.ok,
                toolDuration: `${toolDuration}ms`
            });
            const summariserPrompt = systemBase +
                "\nYou have just executed a tool and received the following result. " +
                "Explain it to the user in a concise, friendly way, in natural language. " +
                "If the tool failed, apologise briefly and explain the failure.";
            logDebug("Persona: Requesting summary from LLM", {
                messageId: src.id,
                toolName: plan.tool
            });
            const summaryStartTime = Date.now();
            const answerResponse = await ollamaChat([
                { role: "system", content: summariserPrompt },
                {
                    role: "user",
                    content: `User message: ${src.content}\n\n` +
                        `Tool used: ${plan.tool}\n` +
                        `Tool result JSON: ${JSON.stringify(result)}`
                }
            ]);
            const summaryDuration = Date.now() - summaryStartTime;
            logInfo("Persona: Summary received from LLM", {
                messageId: src.id,
                summaryLength: answerResponse.message.content.length,
                summaryDuration: `${summaryDuration}ms`
            });
            return answerResponse.message.content.trim();
        }
        // Unknown plan type -> fallback
        logWarn("Persona: Unknown plan type, falling back to plain chat", {
            messageId: src.id,
            planType: plan?.type
        });
        return await plainChatFallback(systemBase, src.content);
    }
    catch (err) {
        logError("Persona: Planner call failed, falling back to plain chat", err, {
            messageId: src.id,
            userId: src.userId
        });
        // If the planner call fails, try a plain chat as last resort
        return await plainChatFallback(systemBase, src.content, err?.message);
    }
}
/**
 * Fallback: simple one-shot chat without tools.
 */
async function plainChatFallback(systemBase, userContent, errorInfo) {
    logDebug("Persona: Using plain chat fallback", {
        hasErrorInfo: !!errorInfo,
        errorInfo: errorInfo?.slice(0, 100)
    });
    const systemPrompt = systemBase +
        (errorInfo
            ? `\n\nNote: tool-planning failed with error: ${errorInfo}. ` +
                "Just answer the user directly without using tools."
            : "");
    try {
        const fallbackStartTime = Date.now();
        const response = await ollamaChat([
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ]);
        const fallbackDuration = Date.now() - fallbackStartTime;
        logInfo("Persona: Plain chat fallback succeeded", {
            responseLength: response.message.content.length,
            duration: `${fallbackDuration}ms`
        });
        return response.message.content.trim();
    }
    catch (err) {
        logError("Persona: Plain chat fallback failed, using echo", err);
        // If even this fails, last resort: echo
        return (`I could not reach the model backend (error: ${err?.message ?? String(err)}). ` + `Here is an echo of your message: "${userContent}"`);
    }
}
// Create singleton instance
const personaServiceInstance = new PersonaService();
/**
 * Persona Component (Service)
 */
export const personaComponent = {
    id: "persona",
    name: "Persona Component",
    description: "Core persona service that processes messages and coordinates with tools",
    service: personaServiceInstance,
    async initialize() {
        await personaServiceInstance.initialize();
    },
    async shutdown() {
        await personaServiceInstance.shutdown();
    }
};
