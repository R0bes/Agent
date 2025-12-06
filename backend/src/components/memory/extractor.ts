/**
 * Memory Extractor Service
 * 
 * Automatically extracts facts, preferences, and episodes from messages
 * using the LLM to identify important information.
 */

import { ollamaChat } from "../llm/ollamaClient";
import { memoryStore } from "./store";
import type { MessageItem } from "../message/types";
import type { MemoryKind, MemoryWrite, SourceReference } from "./types";
import { getMemorySettings } from "../../config/settings";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

export interface ExtractedMemory {
  kind: MemoryKind;
  title: string;
  content: string;
  tags?: string[];
}

export interface ExtractionResult {
  extracted: ExtractedMemory[];
  skipped: boolean;
  reason?: string;
}

/**
 * Memory Extractor
 */
export class MemoryExtractor {
  /**
   * Extract memories from a message
   */
  async extractFromMessage(message: MessageItem): Promise<ExtractionResult> {
    const settings = getMemorySettings();

    // Skip if auto-extract is disabled
    if (!settings.enabled || !settings.autoExtract) {
      return { extracted: [], skipped: true, reason: "auto-extract disabled" };
    }

    // Skip very short messages
    if (message.content.length < 10) {
      return { extracted: [], skipped: true, reason: "message too short" };
    }

    // Skip common filler messages
    const fillerPatterns = /^(ok|okay|thanks|danke|yes|ja|no|nein|👍|👌)$/i;
    if (fillerPatterns.test(message.content.trim())) {
      return { extracted: [], skipped: true, reason: "filler message" };
    }

    logDebug("MemoryExtractor: Extracting from message", {
      messageId: message.id,
      userId: message.userId,
      contentLength: message.content.length
    });

    try {
      const extracted = await this.extractWithLLM(message);

      if (extracted.length === 0) {
        return { extracted: [], skipped: false };
      }

      // Create source reference
      const sourceRef: SourceReference = {
        type: "message",
        id: message.id,
        timestamp: message.createdAt,
        excerpt: message.content.slice(0, 100)
      };

      // Store extracted memories
      const stored: ExtractedMemory[] = [];
      for (const memory of extracted) {
        try {
          const memoryWrite: MemoryWrite = {
            userId: message.userId,
            kind: memory.kind,
            title: memory.title,
            content: memory.content,
            tags: memory.tags,
            conversationId: message.conversationId,
            sourceReferences: [sourceRef]
          };

          await memoryStore.add(memoryWrite);
          stored.push(memory);

          logInfo("MemoryExtractor: Memory created", {
            messageId: message.id,
            kind: memory.kind,
            title: memory.title
          });
        } catch (err) {
          logError("MemoryExtractor: Failed to store memory", err, {
            messageId: message.id,
            memoryTitle: memory.title
          });
        }
      }

      return { extracted: stored, skipped: false };
    } catch (err) {
      logError("MemoryExtractor: Extraction failed", err, {
        messageId: message.id
      });
      return { extracted: [], skipped: true, reason: "extraction error" };
    }
  }

  /**
   * Use LLM to extract memories
   */
  private async extractWithLLM(message: MessageItem): Promise<ExtractedMemory[]> {
    const systemPrompt = `You are a memory extraction assistant. Your task is to analyze user messages and extract important information as structured memories.

Extract information into these categories:
- **fact**: Objective facts about the user, their work, environment, or context
- **preference**: User preferences, likes, dislikes, coding styles, or workflow choices
- **episode**: Significant events, incidents, decisions, or discussions
- **summary**: General conversation summaries (use sparingly, only for lengthy discussions)

Rules:
1. Only extract information that is likely to be relevant in future conversations
2. Be concise but preserve important details
3. Skip trivial information or generic statements
4. Return ONLY valid JSON, no other text
5. If no important information is found, return an empty array: []

Response format (JSON array):
[
  {
    "kind": "fact" | "preference" | "summary" | "episode",
    "title": "Short descriptive title",
    "content": "Detailed content of the memory",
    "tags": ["tag1", "tag2"]
  }
]`;

    const userPrompt = `Extract memories from this message:

Role: ${message.role}
Content: ${message.content}

Return extracted memories as JSON array, or [] if nothing important.`;

    try {
      const response = await ollamaChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]);

      const content = response.message.content.trim();

      // Try to parse JSON
      let extracted: ExtractedMemory[] = [];
      try {
        extracted = JSON.parse(content);
      } catch (parseErr) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[1]);
        } else {
          logWarn("MemoryExtractor: Could not parse LLM response as JSON", {
            response: content.slice(0, 200)
          });
          return [];
        }
      }

      // Validate extracted memories
      if (!Array.isArray(extracted)) {
        logWarn("MemoryExtractor: LLM response is not an array");
        return [];
      }

      const valid = extracted.filter(m => 
        m.kind && m.title && m.content &&
        ["fact", "preference", "summary", "episode"].includes(m.kind)
      );

      logDebug("MemoryExtractor: LLM extraction completed", {
        extractedCount: valid.length,
        kinds: valid.map(m => m.kind)
      });

      return valid;
    } catch (err) {
      logError("MemoryExtractor: LLM call failed", err);
      throw err;
    }
  }
}

// Create singleton instance
export const memoryExtractor = new MemoryExtractor();

