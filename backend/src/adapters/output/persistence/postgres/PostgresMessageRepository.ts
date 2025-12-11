/**
 * PostgreSQL Message Repository
 * 
 * Implements IMessageRepository using PostgreSQL
 */

import type { IMessageRepository, Message, MessageQuery } from "../../../../ports/output/repositories/IMessageRepository";
import { getPostgresPool } from "../../../../infrastructure/database/postgres/connection";
import { logDebug, logError } from "../../../../infrastructure/logging/logger";

export class PostgresMessageRepository implements IMessageRepository {
  async save(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    const pool = getPostgresPool();
    const now = new Date().toISOString();
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      await pool.query(
        `INSERT INTO messages (id, conversation_id, user_id, role, content, created_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          message.conversationId,
          message.userId,
          message.role,
          message.content,
          now,
          message.metadata ? JSON.stringify(message.metadata) : null
        ]
      );

      return {
        id,
        conversationId: message.conversationId,
        userId: message.userId,
        role: message.role,
        content: message.content,
        createdAt: now,
        metadata: message.metadata
      };
    } catch (err) {
      logError("PostgresMessageRepository: Failed to save message", err);
      throw err;
    }
  }

  async findByConversation(query: MessageQuery): Promise<Message[]> {
    const pool = getPostgresPool();
    let sql = `SELECT * FROM messages WHERE conversation_id = $1`;
    const params: any[] = [query.conversationId];

    if (query.since) {
      sql += ` AND created_at >= $${params.length + 1}`;
      params.push(query.since);
    }

    sql += ` ORDER BY created_at ASC`;

    if (query.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(query.offset);
    }

    try {
      const result = await pool.query(sql, params);
      return result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (err) {
      logError("PostgresMessageRepository: Failed to find messages", err);
      throw err;
    }
  }

  async findRecent(conversationId: string, limit: number): Promise<Message[]> {
    return this.findByConversation({ conversationId, limit });
  }

  async count(conversationId: string): Promise<number> {
    const pool = getPostgresPool();
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1`,
        [conversationId]
      );
      return parseInt(result.rows[0].count);
    } catch (err) {
      logError("PostgresMessageRepository: Failed to count messages", err);
      throw err;
    }
  }

  async findRange(conversationId: string, startId: string, endId: string): Promise<Message[]> {
    const pool = getPostgresPool();
    try {
      const result = await pool.query(
        `SELECT * FROM messages 
         WHERE conversation_id = $1 
         AND id >= $2 
         AND id <= $3 
         ORDER BY created_at ASC`,
        [conversationId, startId, endId]
      );
      return result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (err) {
      logError("PostgresMessageRepository: Failed to find message range", err);
      throw err;
    }
  }

  async findById(messageId: string): Promise<Message | null> {
    const pool = getPostgresPool();
    try {
      const result = await pool.query(
        `SELECT * FROM messages WHERE id = $1`,
        [messageId]
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
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } catch (err) {
      logError("PostgresMessageRepository: Failed to find message by ID", err);
      throw err;
    }
  }
}

