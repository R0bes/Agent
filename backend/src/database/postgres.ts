/**
 * PostgreSQL Connection Pool
 * 
 * Provides PostgreSQL connection for all database operations.
 */

import { Pool, PoolConfig } from "pg";
import { getDatabaseSettings } from "../config/settings";
import { logInfo, logError, logWarn } from "../utils/logger";

let pool: Pool | null = null;
const MAX_RETRIES = parseInt(process.env.POSTGRES_MAX_RETRIES || "5");
const BASE_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Create and initialize PostgreSQL connection pool
 */
export async function createPostgresPool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const dbSettings = getDatabaseSettings();

  const config: PoolConfig = {
    host: dbSettings.postgres.host,
    port: dbSettings.postgres.port,
    database: dbSettings.postgres.database,
    user: dbSettings.postgres.user,
    password: dbSettings.postgres.password,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  logInfo("Postgres: Creating connection pool", {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    pool = new Pool(config);

    pool.on("error", (err) => {
      logError("Postgres: Unexpected error on idle client", err);
    });

    pool.on("connect", () => {
      logInfo("Postgres: New client connected to pool");
    });

    try {
      const client = await pool.connect();
      await client.query("SELECT NOW()");
      client.release();
      logInfo("Postgres: Connection pool initialized successfully");
      return pool;
    } catch (err) {
      logWarn("Postgres: Failed to connect", {
        attempt,
        maxRetries: MAX_RETRIES,
        error: err instanceof Error ? err.message : String(err)
      });
      await pool.end().catch(() => {});
      pool = null;

      if (attempt === MAX_RETRIES) {
        logError("Postgres: Exhausted retries, giving up", err);
        logWarn("Postgres: To start Postgres, run: docker compose -f devops/docker-compose.yml up -d postgres");
        throw err;
      }

      const delayMs = Math.min(BASE_DELAY_MS * attempt, 5000);
      await delay(delayMs);
    }
  }

  // Should never reach here
  throw new Error("Postgres: Failed to initialize pool after retries");
}

/**
 * Get existing pool or throw error
 */
export function getPostgresPool(): Pool {
  if (!pool) {
    throw new Error("Postgres pool not initialized. Call createPostgresPool() first.");
  }
  return pool;
}

/**
 * Close the connection pool
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    logInfo("Postgres: Closing connection pool");
    await pool.end();
    pool = null;
    logInfo("Postgres: Connection pool closed");
  }
}

