/**
 * Memory Compaction Worker Component
 * 
 * Implements Worker interface using AbstractWorker base class.
 * - Worker: Intelligent background worker that compacts and summarises conversation history
 */

import { AbstractWorker } from "../../../legacy/components/base/AbstractWorker";
import type { Component, ToolContext } from "../../../legacy/components/types";
import { memoryStore } from "../../memory";
import { messageStore } from "../../message/store";
import { ollamaChat } from "../../llm/ollamaClient";
import type { SourceReference } from "../../memory/types";
import { logInfo, logDebug, logWarn, logError } from "../../../utils/logger";

interface CompactionArgs {
  userId?: string;
  conversationId?: string;
  mode?: "auto" | "manual" | "topic_change";
  startMessageId?: string;
  endMessageId?: string;
}

/**
 * Memory Compaction Worker
 * 
 * Intelligently compacts conversation history into structured memories:
 * - Facts: Stable user information
 * - Preferences: User likes, dislikes, working styles
 * - Summaries: High-level discussion summaries
 * - Episodes: Notable events or decisions
 */
class MemoryCompactionWorker extends AbstractWorker {
  readonly name = "memory_compaction_worker";
  readonly description = "Intelligent background worker that compacts conversation history into structured memories";
  readonly category = "memory";
  readonly maxRetries = 5;
  readonly priority = "low";

  protected async run(args: CompactionArgs, ctx: ToolContext): Promise<void> {
    const userId = args.userId ?? ctx.userId;
    const conversationId = args.conversationId ?? ctx.conversationId;
    const mode = args.mode ?? "auto";

    logInfo("Memory Worker: Starting intelligent compaction", {
      userId,
      conversationId,
      mode
    });

    try {
      // 1. Load conversation segment to compact from messageStore
      const allMessages = await messageStore.list({
        conversationId,
        limit: 1000,
        orderBy: "created_at_asc"
      });

      if (allMessages.length === 0) {
        logWarn("Memory Worker: No messages to compact", {
          userId,
          conversationId
        });
        return;
      }

      // Filter messages by range if specified, otherwise take recent ones
      let messages = allMessages;
      if (args.startMessageId && args.endMessageId) {
        const startIndex = messages.findIndex(m => m.id === args.startMessageId);
        const endIndex = messages.findIndex(m => m.id === args.endMessageId);
        if (startIndex >= 0 && endIndex >= 0 && endIndex >= startIndex) {
          messages = messages.slice(startIndex, endIndex + 1);
        }
      } else {
        // Take last 25 messages for compaction
        messages = allMessages.slice(-25);
      }

      if (messages.length === 0) {
        logWarn("Memory Worker: No messages in range to compact", {
          userId,
          conversationId
        });
        return;
      }

      logDebug("Memory Worker: Loaded messages for compaction", {
        messageCount: messages.length,
        firstMessageId: messages[0]?.id,
        lastMessageId: messages[messages.length - 1]?.id
      });

      // 2. Build conversation text
      const conversationText = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

      // 3. Use LLM to extract structured memories
      const extractionPrompt = this.buildExtractionPrompt(mode);

      logDebug("Memory Worker: Requesting extraction from LLM", {
        conversationLength: conversationText.length,
        mode
      });

      const llmResponse = await ollamaChat([
        { role: "system", content: extractionPrompt },
        {
          role: "user",
          content: `Analyze this conversation segment and extract memories:\n\n${conversationText}`
        }
      ]);

      // 4. Parse LLM response (expecting JSON)
      let extractedMemories: any;
      try {
        const cleaned = llmResponse.message.content
          .trim()
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        
        extractedMemories = JSON.parse(cleaned);
        
        logDebug("Memory Worker: Successfully parsed extraction response", {
          hasFacts: !!extractedMemories.facts,
          hasPreferences: !!extractedMemories.preferences,
          hasSummaries: !!extractedMemories.summaries,
          hasEpisodes: !!extractedMemories.episodes
        });
      } catch (parseErr) {
        logWarn("Memory Worker: Failed to parse LLM response as JSON", {
          response: llmResponse.message.content.slice(0, 200),
          error: parseErr instanceof Error ? parseErr.message : String(parseErr)
        });
        
        // Fallback: Create a simple summary
        extractedMemories = {
          summaries: [
            {
              title: "Conversation Summary",
              content: llmResponse.message.content.slice(0, 500)
            }
          ]
        };
      }

      // 5. Store extracted memories with source references
      const storedMemories = await this.storeExtractedMemories(
        extractedMemories,
        userId,
        conversationId,
        messages
      );

      logInfo("Memory Worker: Compaction completed successfully", {
        userId,
        conversationId,
        messagesProcessed: messages.length,
        memoriesCreated: storedMemories.length,
        mode
      });

    } catch (err) {
      logError("Memory Worker: Compaction failed", err, {
        userId,
        conversationId,
        mode
      });
      throw err;
    }
  }

  /**
   * Build the extraction prompt based on compaction mode
   */
  private buildExtractionPrompt(mode: string): string {
    const basePrompt = `You are a memory extraction assistant. Your task is to analyze conversation segments and extract structured memories.

Extract the following types of memories:

1. **Facts**: Stable, factual information about the user (name, job, location, projects, technical skills, etc.)
   - Only extract confirmed, stable facts
   - Examples: "User is a software developer", "User works on AI projects"

2. **Preferences**: User's likes, dislikes, working styles, communication preferences
   - Examples: "Prefers German language responses", "Likes clean code architecture"

3. **Summaries**: High-level summaries of what was discussed in the conversation
   - Be concise but capture the essence
   - Examples: "Discussed implementation of memory compaction system"

4. **Episodes**: Notable events, decisions, or milestones in the conversation
   - Examples: "Decided to use LLM-based memory extraction", "Implemented conversation store"

Respond with **valid JSON only** in this exact format:
{
  "facts": [
    { "title": "Short title", "content": "Detailed content" }
  ],
  "preferences": [
    { "title": "Short title", "content": "Detailed content" }
  ],
  "summaries": [
    { "title": "Short title", "content": "Detailed content" }
  ],
  "episodes": [
    { "title": "Short title", "content": "Detailed content" }
  ]
}

Guidelines:
- Be concise but informative
- Only extract significant, non-trivial information
- Facts should be stable (not temporary states)
- Summaries should capture essence, not just repeat
- If a category has no entries, use an empty array []
- NO markdown code blocks in your response, just pure JSON`;

    if (mode === "topic_change") {
      return basePrompt + "\n\nMode: topic_change - Focus on summarizing the previous topic before the change.";
    } else if (mode === "manual") {
      return basePrompt + "\n\nMode: manual - User requested this compaction, be thorough.";
    }

    return basePrompt + "\n\nMode: auto - Automatic background compaction.";
  }

  /**
   * Store extracted memories in the memory store with source references
   */
  private async storeExtractedMemories(
    extracted: any,
    userId: string,
    conversationId: string,
    sourceMessages: Array<{ id: string; createdAt: string; content: string }>
  ): Promise<string[]> {
    const stored: string[] = [];

    const kinds: Array<"fact" | "preference" | "summary" | "episode"> = [
      "fact",
      "preference",
      "summary",
      "episode"
    ];

    // Create source references from messages
    const sourceReferences: SourceReference[] = sourceMessages.map(msg => ({
      type: "message",
      id: msg.id,
      timestamp: msg.createdAt,
      excerpt: msg.content.slice(0, 100) // First 100 chars as excerpt
    }));

    for (const kind of kinds) {
      const items = extracted[`${kind}s`] || extracted[kind] || [];
      
      if (!Array.isArray(items)) {
        logWarn("Memory Worker: Invalid items array for kind", {
          kind,
          itemsType: typeof items
        });
        continue;
      }

      for (const item of items) {
        if (item && item.title && item.content) {
          try {
            const memory = await memoryStore.add({
              userId,
              kind,
              title: item.title,
              content: item.content,
              tags: ["compaktified", kind, conversationId],
              conversationId,
              sourceReferences,
              isCompaktified: true
            });
            stored.push(memory.id);
            
            logDebug("Memory Worker: Memory stored (compaktified)", {
              memoryId: memory.id,
              kind,
              title: item.title,
              sourceMessageCount: sourceReferences.length
            });
          } catch (err) {
            logWarn("Memory Worker: Failed to store memory", {
              kind,
              title: item.title,
              error: err instanceof Error ? err.message : String(err)
            });
          }
        }
      }
    }

    return stored;
  }
}

// Create singleton instance
const memoryCompactionWorkerInstance = new MemoryCompactionWorker();

/**
 * Memory Compaction Worker Component
 */
export const memoryCompactionWorkerComponent: Component = {
  id: "memory-compaction-worker",
  name: "Memory Compaction Worker Component",
  description: "Intelligent background worker for conversation compaction",
  worker: memoryCompactionWorkerInstance
};

// Export the worker instance for direct registration if needed
export { memoryCompactionWorkerInstance };
