/**
 * PostgreSQL Conversation Repository
 * 
 * Implements IConversationRepository using PostgreSQL
 */

import type { IConversationRepository, Conversation } from "../../../../ports/output/repositories/IConversationRepository";
import { getPostgresPool } from "../../../../infrastructure/database/postgres/connection";
import { logError } from "../../../../infrastructure/logging/logger";

export class PostgresConversationRepository implements IConversationRepository {
  async save(conversation: Omit<Conversation, "id" | "createdAt" | "updatedAt">): Promise<Conversation> {
    const pool = getPostgresPool();
    const now = new Date().toISOString();
    const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      await pool.query(
        `INSERT INTO conversations (id, user_id, title, created_at, updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          conversation.userId,
          conversation.title || null,
          now,
          now,
          conversation.metadata ? JSON.stringify(conversation.metadata) : null
        ]
      );

      return {
        id,
        userId: conversation.userId,
        createdAt: now,
        updatedAt: now,
        title: conversation.title,
        metadata: conversation.metadata
      };
    } catch (err) {
      logError("PostgresConversationRepository: Failed to save conversation", err);
      throw err;
    }
  }

  async findById(conversationId: string): Promise<Conversation | null> {
    const pool = getPostgresPool();
    try {
      const result = await pool.query(
        `SELECT * FROM conversations WHERE id = $1`,
        [conversationId]
      );
      if (result.rows.length === 0) {
        return null;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        title: row.title,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } catch (err) {
      logError("PostgresConversationRepository: Failed to find conversation", err);
      throw err;
    }
  }

  async findByUser(userId: string, options?: { limit?: number; offset?: number }): Promise<Conversation[]> {
    const pool = getPostgresPool();
    let sql = `SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC`;
    const params: any[] = [userId];

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    try {
      const result = await pool.query(sql, params);
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        title: row.title,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (err) {
      logError("PostgresConversationRepository: Failed to find conversations by user", err);
      throw err;
    }
  }

  async update(conversationId: string, updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>): Promise<Conversation> {
    const pool = getPostgresPool();
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(updates.metadata));
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    params.push(conversationId);

    try {
      await pool.query(
        `UPDATE conversations SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
        params
      );

      const updated = await this.findById(conversationId);
      if (!updated) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }
      return updated;
    } catch (err) {
      logError("PostgresConversationRepository: Failed to update conversation", err);
      throw err;
    }
  }

  async delete(conversationId: string): Promise<void> {
    const pool = getPostgresPool();
    try {
      await pool.query(`DELETE FROM conversations WHERE id = $1`, [conversationId]);
    } catch (err) {
      logError("PostgresConversationRepository: Failed to delete conversation", err);
      throw err;
    }
  }
}

