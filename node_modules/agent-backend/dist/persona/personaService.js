import { eventBus } from "../events/eventBus";
import { createDemoJob, updateJobStatus, listJobs } from "../models/jobStore";
import { addMemoryForUser, listMemoriesForUser } from "../models/memoryStore";
import { guiSourceAdapter } from "../sources/guiAdapter";
import { toolEngine } from "../tools/toolEngine";
import { ollamaChat } from "../llm/ollamaClient";
import { listTools } from "../tools/toolRegistry";
let messageCounter = 0;
/**
 * Entry point for GUI chat messages.
 *  - normalises the request into a SourceMessage
 *  - calls the persona core (which can use tools via Ollama)
 *  - keeps the demo jobs + memory behaviour for now
 */
export async function handleUserMessage(conversationId, userId, text) {
    const [srcMsg] = await guiSourceAdapter.toSourceMessages({
        conversationId,
        userId,
        text
    });
    const assistantContent = await runPersonaForSourceMessage(srcMsg);
    messageCounter += 1;
    const reply = {
        id: `msg-${messageCounter}`,
        conversationId,
        role: "assistant",
        content: assistantContent,
        createdAt: new Date().toISOString()
    };
    // --- demo job + memory logic (unchanged, still useful for the UI) ---
    const jobLabel = `Process message: "${text.slice(0, 32)}${text.length > 32 ? "…" : ""}"`;
    const job = createDemoJob(jobLabel, "tool");
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
    await addMemoryForUser(userId, "Recent message summary", `User said: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}".`);
    await eventBus.emit({
        type: "memory_updated",
        payload: { userId, memories: await listMemoriesForUser(userId) }
    });
    return reply;
}
/**
 * Simple tool-aware persona core:
 *
 * 1. Builds a list of tools and passes it to Ollama
 * 2. Asks Ollama to respond with a JSON plan:
 *    { "type": "final", "content": "..." }
 *    or
 *    { "type": "tool_call", "tool": "toolName", "args": { ... } }
 * 3. If a tool_call is requested:
 *    - executes the tool via ToolEngine
 *    - makes a second Ollama call to turn tool result into a nice answer
 * 4. On any error or malformed JSON, falls back to a plain single-turn answer.
 */
async function runPersonaForSourceMessage(src) {
    const systemBase = "You are a helpful personal assistant. " +
        "You can optionally use tools to help answer the user's request. " +
        "You are being called from different sources (gui, scheduler, messaging apps).";
    const availableTools = listTools();
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
    // Step 1: ask Ollama for a plan (tool or final)
    try {
        const planResponse = await ollamaChat([
            { role: "system", content: plannerSystemPrompt },
            {
                role: "user",
                content: `User message: ${src.content}`
            }
        ]);
        const raw = planResponse.message.content.trim();
        let plan = null;
        try {
            plan = JSON.parse(raw);
        }
        catch {
            // Not valid JSON -> fall back to plain chat
            return await plainChatFallback(systemBase, src.content);
        }
        if (!plan || typeof plan !== "object" || !("type" in plan)) {
            return await plainChatFallback(systemBase, src.content);
        }
        if (plan.type === "final") {
            return plan.content;
        }
        if (plan.type === "tool_call") {
            const result = await toolEngine.execute({ name: plan.tool, args: plan.args ?? {} }, toolCtx);
            const summariserPrompt = systemBase +
                "\nYou have just executed a tool and received the following result. " +
                "Explain it to the user in a concise, friendly way, in natural language. " +
                "If the tool failed, apologise briefly and explain the failure.";
            const answerResponse = await ollamaChat([
                { role: "system", content: summariserPrompt },
                {
                    role: "user",
                    content: `User message: ${src.content}\n\n` +
                        `Tool used: ${plan.tool}\n` +
                        `Tool result JSON: ${JSON.stringify(result)}`
                }
            ]);
            return answerResponse.message.content.trim();
        }
        // Unknown plan type -> fallback
        return await plainChatFallback(systemBase, src.content);
    }
    catch (err) {
        // If the planner call fails, try a plain chat as last resort
        return await plainChatFallback(systemBase, src.content, err?.message);
    }
}
/**
 * Fallback: simple one-shot chat without tools.
 */
async function plainChatFallback(systemBase, userContent, errorInfo) {
    const systemPrompt = systemBase +
        (errorInfo
            ? `\n\nNote: tool-planning failed with error: ${errorInfo}. ` +
                "Just answer the user directly without using tools."
            : "");
    try {
        const response = await ollamaChat([
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ]);
        return response.message.content.trim();
    }
    catch (err) {
        // If even this fails, last resort: echo
        return (`I could not reach the model backend (error: ${err?.message ?? String(err)}). ` + `Here is an echo of your message: "${userContent}"`);
    }
}
