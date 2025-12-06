/**
 * Context Builder
 * Builds optimal LLM context from conversation history and long-term memory
 */

import { conversationStore } from "../../models/conversationStore";
import { messageStore } from "../message/store";
import { memoryStore } from "../memory";
import type { MemoryKind } from "../memory/types";
import type { MessageItem } from "../message/types";
import type { OllamaChatMessage } from "../llm/ollamaClient";
import { embeddingClient } from "../llm/embeddingClient";
import { logDebug, logInfo } from "../../utils/logger";

export interface ContextBuildOptions {
  userId: string;
  conversationId: string;
  includeHistory?: boolean;
  maxHistoryMessages?: number;
  includeMemory?: boolean;
  memoryKinds?: MemoryKind[];
  memoryLimit?: number;
}

export interface ContextBuildResult {
  messages: OllamaChatMessage[];
  memoryContext: string;
  metadata: {
    historyCount: number;
    memoryCount: number;
    estimatedTokens: number;
  };
}

/**
 * Build context for LLM from conversation history and memory
 */
export async function buildContext(
  userMessage: string,
  options: ContextBuildOptions
): Promise<ContextBuildResult> {
  const messages: OllamaChatMessage[] = [];
  let historyCount = 0;
  let memoryCount = 0;
  let memoryContext = "";

  logDebug("Context Builder: Building context", {
    userId: options.userId,
    conversationId: options.conversationId,
    includeHistory: options.includeHistory,
    includeMemory: options.includeMemory
  });

  // 1. Load and format memory context (if enabled)
  if (options.includeMemory !== false) {
    // Try semantic search first: generate embedding from conversation history
    let memories: Array<{ kind: string; title: string; content: string }> = [];
    
    try {
      // Get recent messages for embedding generation
      const recentMessages = await messageStore.list({
        conversationId: options.conversationId,
        limit: options.maxHistoryMessages || 10,
        orderBy: "created_at_desc"
      });

      if (recentMessages.length > 0) {
        // Generate embedding from conversation
        const conversationEmbedding = await generateConversationEmbedding(
          recentMessages.reverse(), // Reverse to get chronological order
          options.maxHistoryMessages || 10
        );

        // Search for similar memories
        const similarMemories = await memoryStore.searchSimilar(
          conversationEmbedding,
          {
            userId: options.userId,
            kinds: options.memoryKinds || ["fact", "preference", "summary"],
            limit: options.memoryLimit || 10
          }
        );

        memories = similarMemories;
        
        logDebug("Context Builder: Semantic memory search completed", {
          memoryCount: memories.length,
          messageCount: recentMessages.length
        });
      }
    } catch (err) {
      logDebug("Context Builder: Semantic search failed, falling back to list", {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    // Fallback to list if semantic search failed or returned no results
    if (memories.length === 0) {
      memories = await memoryStore.list({
        userId: options.userId,
        kinds: options.memoryKinds || ["fact", "preference", "summary"],
        limit: options.memoryLimit || 10
      });

      logDebug("Context Builder: Memories loaded via list (fallback)", {
        memoryCount: memories.length
      });
    }

    if (memories.length > 0) {
      memoryContext = formatMemoryContext(memories);
      memoryCount = memories.length;

      logDebug("Context Builder: Memories loaded", {
        memoryCount,
        kinds: options.memoryKinds
      });
    }
  }

  // 2. Load conversation history (if enabled)
  if (options.includeHistory !== false) {
    const recentMessages = await conversationStore.getRecentMessages(
      options.conversationId,
      options.maxHistoryMessages || 10
    );

    for (const msg of recentMessages) {
      messages.push({
        role: msg.role as any,
        content: msg.content
      });
      historyCount++;
    }

    logDebug("Context Builder: History loaded", {
      historyCount,
      maxMessages: options.maxHistoryMessages
    });
  }

  // 3. Add current user message
  messages.push({
    role: "user",
    content: userMessage
  });

  // 4. Calculate estimated tokens (rough: 1 token ≈ 4 chars)
  const totalChars =
    messages.reduce((sum, m) => sum + m.content.length, 0) +
    memoryContext.length;
  const estimatedTokens = Math.ceil(totalChars / 4);

  logInfo("Context Builder: Context built", {
    historyCount,
    memoryCount,
    estimatedTokens,
    userId: options.userId,
    conversationId: options.conversationId
  });

  return {
    messages,
    memoryContext,
    metadata: {
      historyCount,
      memoryCount,
      estimatedTokens
    }
  };
}

/**
 * Format memory items into a context string for the system prompt
 */
export function formatMemoryContext(memories: Array<{
  kind: string;
  title: string;
  content: string;
}>): string {
  if (memories.length === 0) return "";

  let context = "\n\n# Relevant Context from Memory:\n";
  
  for (const mem of memories) {
    context += `- [${mem.kind}] ${mem.title}: ${mem.content}\n`;
  }

  return context;
}

/**
 * Prepend memory context to system prompt
 */
export function prependMemoryToSystemPrompt(
  basePrompt: string,
  memoryContext: string
): string {
  if (!memoryContext) return basePrompt;
  return basePrompt + memoryContext;
}

/**
 * Generate embedding for conversation messages
 * Combines the last N messages into a single text and generates an embedding
 */
export async function generateConversationEmbedding(
  messages: MessageItem[],
  maxMessages: number = 10
): Promise<number[]> {
  if (messages.length === 0) {
    throw new Error("Cannot generate embedding from empty message list");
  }

  // Take last N messages
  const recentMessages = messages.slice(-maxMessages);

  // Combine messages into a single text
  const conversationText = recentMessages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n\n");

  logDebug("Context Builder: Generating conversation embedding", {
    messageCount: recentMessages.length,
    textLength: conversationText.length
  });

  try {
    const embeddingResult = await embeddingClient.embed(conversationText);
    
    logInfo("Context Builder: Conversation embedding generated", {
      dimension: embeddingResult.dimension,
      messageCount: recentMessages.length
    });

    return embeddingResult.embedding;
  } catch (err) {
    logDebug("Context Builder: Failed to generate embedding", {
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

