/**
 * Persona Message Handler
 * 
 * Handles processing of source messages and generating assistant responses.
 * This is used by the Persona Service.
 */

import { memoryStore } from "../memory/store";
import { memoryExtractor } from "../memory/extractor";
import { messageStore } from "../message/store";
import { conversationStore } from "../../legacy/models/conversationStore";
import { buildContext, prependMemoryToSystemPrompt } from "./contextBuilder";
import { compactionTrigger } from "./compactionTrigger";
import { toolEngine } from "../tools/toolEngine";
import type { ToolContext } from "../types";
import { getTools } from "../registry";
import { ollamaChat } from "../llm/ollamaClient";
import type { OllamaChatMessage } from "../llm/ollamaClient";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";
import { eventBus } from "../../events/eventBus";
import type { SourceMessage } from "../types";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  createdAt: string;
}

let messageCounter = 0;

/**
 * Entry point for processing source messages.
 * This is called by sources (e.g., GUI adapter) to process user messages.
 */
export async function handleSourceMessage(srcMsg: SourceMessage): Promise<ChatMessage> {
  logInfo("Persona: Processing source message", {
    messageId: srcMsg.id,
    userId: srcMsg.userId,
    conversationId: srcMsg.conversationId,
    sourceKind: srcMsg.source.kind,
    contentLength: srcMsg.content.length
  });

  // 1. Store user message in both stores
  await conversationStore.add({
    id: srcMsg.id,
    conversationId: srcMsg.conversationId,
    userId: srcMsg.userId,
    role: "user",
    content: srcMsg.content,
    createdAt: srcMsg.createdAt,
    metadata: {
      sourceKind: srcMsg.source.kind
    }
  });

  const userMessage = await messageStore.save({
    id: srcMsg.id,
    conversationId: srcMsg.conversationId,
    userId: srcMsg.userId,
    role: "user",
    content: srcMsg.content,
    metadata: {
      source: srcMsg.source
    }
  });

  logDebug("Persona: User message stored", {
    messageId: userMessage.id
  });

  const startTime = Date.now();
  const assistantContent = await runPersonaForSourceMessage(srcMsg);
  const processingDuration = Date.now() - startTime;

  messageCounter += 1;
  const reply: ChatMessage = {
    id: `msg-${Date.now()}-${messageCounter}-${Math.random().toString(16).slice(2)}`,
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

  // 2. Store assistant message in both stores
  await conversationStore.add({
    id: reply.id,
    conversationId: reply.conversationId,
    userId: srcMsg.userId,
    role: "assistant",
    content: reply.content,
    createdAt: reply.createdAt,
    metadata: {
      processingDuration
    }
  });

  // Try to save to messageStore, but don't fail if it already exists
  try {
    await messageStore.save({
      id: reply.id,
      conversationId: reply.conversationId,
      userId: srcMsg.userId,
      role: "assistant",
      content: reply.content,
      metadata: {
        processingDuration
      }
    });
  } catch (err: any) {
    // If message already exists (duplicate key), log but continue
    // The message is already in conversationStore, so this is not critical
    if (err?.code === "23505") {
      logDebug("Persona: Assistant message already exists in messageStore, skipping", {
        messageId: reply.id,
        conversationId: reply.conversationId
      });
    } else {
      // For other errors, log but continue - don't fail the entire request
      logWarn("Persona: Failed to save assistant message to messageStore, continuing anyway", {
        messageId: reply.id,
        conversationId: reply.conversationId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // 3. Extract memories from user message using LLM
  try {
    const extractionResult = await memoryExtractor.extractFromMessage(userMessage);
    
    if (extractionResult.extracted.length > 0) {
      logInfo("Persona: Memories extracted from message", {
        messageId: userMessage.id,
        memoryCount: extractionResult.extracted.length,
        kinds: extractionResult.extracted.map(m => m.kind)
      });
    } else if (extractionResult.skipped) {
      logDebug("Persona: Memory extraction skipped", {
        messageId: userMessage.id,
        reason: extractionResult.reason
      });
    }
  } catch (err) {
    logError("Persona: Memory extraction failed", err, {
      messageId: userMessage.id
    });
  }

  // 4. Emit memory_updated event with new memories
  const memories = await memoryStore.list({ userId: srcMsg.userId, limit: 50 });
  await eventBus.emit({
    type: "memory_updated",
    payload: { userId: srcMsg.userId, memories }
  });

  // --- check if memory compaction should be triggered ---
  
  const toolCtx: ToolContext = {
    userId: srcMsg.userId,
    conversationId: srcMsg.conversationId,
    source: srcMsg.source,
    meta: {}
  };

  try {
    const triggerCheck = await compactionTrigger.shouldTrigger(
      srcMsg.conversationId,
      toolCtx
    );

    if (triggerCheck.shouldTrigger) {
      logInfo("Persona: Auto-triggering memory compaction", {
        conversationId: srcMsg.conversationId,
        userId: srcMsg.userId,
        reason: triggerCheck.reason,
        priority: triggerCheck.priority
      });

      // Trigger compaction in background (don't await)
      compactionTrigger.trigger(
        srcMsg.conversationId,
        toolCtx,
        "auto"
      ).catch(err => {
        logWarn("Persona: Failed to trigger compaction", {
          conversationId: srcMsg.conversationId,
          error: err instanceof Error ? err.message : String(err)
        });
      });
    }
  } catch (err) {
    logWarn("Persona: Error checking compaction trigger", {
      conversationId: srcMsg.conversationId,
      error: err instanceof Error ? err.message : String(err)
    });
  }

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
async function runPersonaForSourceMessage(src: SourceMessage): Promise<string> {
  logDebug("Persona: Starting message processing", {
    messageId: src.id,
    userId: src.userId,
    conversationId: src.conversationId
  });

  const systemBase =
    "You are a helpful personal assistant. " +
    "You can optionally use tools to help answer the user's request. " +
    "You are being called from different sources (gui, scheduler, messaging apps).";

  // Get tools from component registry (already filtered for enabled tools)
  // Optionally, we could query the toolbox tool, but getTools() already filters
  const availableTools = getTools();
  logDebug("Persona: Available tools retrieved", {
    toolCount: availableTools.length,
    toolNames: availableTools.map(t => t.name)
  });

  const toolsDescription = availableTools
    .map(
      (t) =>
        `- name: ${t.name}\n  description: ${t.description}\n  parameters: ${JSON.stringify(
          t.parameters ?? {}
        )}`
    )
    .join("\n");

  const plannerSystemPrompt =
    systemBase +
    "\n\nYou have access to the following tools:\n" +
    toolsDescription +
    "\n\nWhen the user asks something, decide if you need a tool. " +
    "Always respond with **pure JSON**, no extra text. " +
    "Use exactly one of these shapes:\n" +
    '{ "type": "final", "content": "<final natural language answer>" }\n' +
    '{ "type": "tool_call", "tool": "<tool name>", "args": { ... } }';

  type PersonaPlan =
    | { type: "final"; content: string }
    | { type: "tool_call"; tool: string; args: any };

  const toolCtx: ToolContext = {
    userId: src.userId,
    conversationId: src.conversationId,
    source: src.source,
    meta: {}
  };

  // Step 1: Build context with history and memory
  const contextResult = await buildContext(src.content, {
    userId: src.userId,
    conversationId: src.conversationId,
    includeHistory: true,
    maxHistoryMessages: 10,
    includeMemory: true,
    memoryKinds: ["fact", "preference", "summary"]
  });

  logDebug("Persona: Context built", {
    historyMessages: contextResult.metadata.historyCount,
    memories: contextResult.metadata.memoryCount,
    estimatedTokens: contextResult.metadata.estimatedTokens
  });

  // Prepend memory context to system prompt
  const plannerSystemPromptWithMemory = prependMemoryToSystemPrompt(
    plannerSystemPrompt,
    contextResult.memoryContext
  );

  // Step 2: ask LLM for a plan (tool or final) with full context
  try {
    logDebug("Persona: Requesting plan from LLM", {
      messageId: src.id,
      userId: src.userId
    });

    const planStartTime = Date.now();
    
    // Build messages with history context
    const llmMessages: OllamaChatMessage[] = [
      { role: "system", content: plannerSystemPromptWithMemory },
      ...contextResult.messages
    ];
    
    const planResponse = await ollamaChat(llmMessages);
    const planDuration = Date.now() - planStartTime;

    logInfo("Persona: LLM plan response received", {
      messageId: src.id,
      userId: src.userId,
      duration: `${planDuration}ms`,
      responseLength: planResponse.message.content.length
    });

    const raw = planResponse.message.content.trim();
    let plan: PersonaPlan | null = null;
    try {
      plan = JSON.parse(raw) as PersonaPlan;
      logDebug("Persona: Plan parsed successfully", {
        messageId: src.id,
        planType: plan.type
      });
    } catch {
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
      const result = await toolEngine.execute(
        { name: plan.tool, args: plan.args ?? {} },
        toolCtx
      );
      const toolDuration = Date.now() - toolStartTime;

      logInfo("Persona: Tool execution completed", {
        messageId: src.id,
        toolName: plan.tool,
        toolSuccess: result.ok,
        toolDuration: `${toolDuration}ms`
      });

      const summariserPrompt =
        systemBase +
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
          content:
            `User message: ${src.content}\n\n` +
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
      planType: (plan as any)?.type
    });
    return await plainChatFallback(systemBase, src.content);
  } catch (err: any) {
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
async function plainChatFallback(
  systemBase: string,
  userContent: string,
  errorInfo?: string
): Promise<string> {
  logDebug("Persona: Using plain chat fallback", {
    hasErrorInfo: !!errorInfo,
    errorInfo: errorInfo?.slice(0, 100)
  });

  const systemPrompt =
    systemBase +
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
  } catch (err: any) {
    logError("Persona: Plain chat fallback failed, using echo", err);
    // If even this fails, last resort: echo
    return (
      `I could not reach the model backend (error: ${
        err?.message ?? String(err)
      }). ` + `Here is an echo of your message: "${userContent}"`
    );
  }
}

