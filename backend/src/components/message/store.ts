/**
 * Message Store Implementation
 * 
 * PostgreSQL-based storage for all conversation messages.
 */

import { getPostgresPool } from "../../database/postgres";
import type { MessageItem, MessageWrite, MessageQuery, MessageStore } from "./types";
import { logInfo, logDebug, logError } from "../../utils/logger";

export class PostgresMessageStore implements MessageStore {
  /**
   * Save a message to the database
   */
  async save(message: MessageWrite): Promise<MessageItem> {
    const pool = getPostgresPool();
    
    const id = message.id || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toISOString();

    logDebug("MessageStore: Saving message", {
      id,
      conversationId: message.conversationId,
      userId: message.userId,
      role: message.role
    });

    try {
      const result = await pool.query(
        `INSERT INTO messages (id, conversation_id, user_id, role, content, created_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          id,
          message.conversationId,
          message.userId,
          message.role,
          message.content,
          now,
          JSON.stringify(message.metadata || {})
        ]
      );

      const row = result.rows[0];
      const saved: MessageItem = {
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        metadata: row.metadata
      };

      logInfo("MessageStore: Message saved", {
        id: saved.id,
        conversationId: saved.conversationId
      });

      return saved;
    } catch (err) {
      logError("MessageStore: Failed to save message", err, {
        id,
        conversationId: message.conversationId
      });
      throw err;
    }
  }

  /**
   * List messages with filters
   */
  async list(query: MessageQuery): Promise<MessageItem[]> {
    const pool = getPostgresPool();
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (query.conversationId) {
      conditions.push(`conversation_id = $${paramIndex++}`);
      values.push(query.conversationId);
    }

    if (query.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(query.userId);
    }

    if (query.roles && query.roles.length > 0) {
      conditions.push(`role = ANY($${paramIndex++})`);
      values.push(query.roles);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = query.orderBy === "created_at_asc" ? "created_at ASC" : "created_at DESC";
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    try {
      const result = await pool.query(
        `SELECT * FROM messages ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...values, limit, offset]
      );

      const messages = result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        metadata: row.metadata
      }));

      logDebug("MessageStore: Listed messages", {
        count: messages.length,
        query: JSON.stringify(query)
      });

      return messages;
    } catch (err) {
      logError("MessageStore: Failed to list messages", err, { query });
      throw err;
    }
  }

  /**
   * Get a message by ID
   */
  async getById(id: string): Promise<MessageItem | null> {
    const pool = getPostgresPool();

    try {
      const result = await pool.query(
        "SELECT * FROM messages WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        metadata: row.metadata
      };
    } catch (err) {
      logError("MessageStore: Failed to get message by ID", err, { id });
      throw err;
    }
  }

  /**
   * Get messages by conversation ID
   */
  async getByConversation(conversationId: string, limit: number = 50): Promise<MessageItem[]> {
    return this.list({
      conversationId,
      limit,
      orderBy: "created_at_desc"
    });
  }
}

// Create singleton instance
export const messageStore: MessageStore = new PostgresMessageStore();

