/**
 * Database Migration Runner
 * 
 * Automatically runs SQL migration files in order.
 */

import { Pool } from "pg";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { logInfo, logWarn, logError } from "../utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Migrations directory (backend/migrations)
const MIGRATIONS_DIR = join(__dirname, "../../migrations");

interface Migration {
  version: number;
  name: string;
  filename: string;
  sql: string;
}

/**
 * Get all migration files sorted by version
 */
function getMigrationFiles(): Migration[] {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort();

    return files.map(filename => {
      const versionMatch = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!versionMatch) {
        throw new Error(`Invalid migration filename format: ${filename}`);
      }

      const version = parseInt(versionMatch[1]);
      const name = versionMatch[2];
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf-8");

      return { version, name, filename, sql };
    });
  } catch (err) {
    logError("Migrations: Failed to read migration files", err);
    throw err;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(pool: Pool): Promise<void> {
  logInfo("Migrations: Starting migration check");

  try {
    // 1. Ensure schema_migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. Get applied migrations
    const { rows } = await pool.query(
      "SELECT version FROM schema_migrations ORDER BY version"
    );
    const appliedVersions = new Set(rows.map(r => r.version));

    logInfo("Migrations: Currently applied versions", {
      count: appliedVersions.size,
      versions: Array.from(appliedVersions)
    });

    // 3. Get migration files
    const migrations = getMigrationFiles();
    logInfo("Migrations: Found migration files", {
      count: migrations.length,
      files: migrations.map(m => m.filename)
    });

    // 4. Apply pending migrations
    let appliedCount = 0;
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        logInfo(`Migrations: ✓ ${migration.version} already applied: ${migration.name}`);
        continue;
      }

      logInfo(`Migrations: → Applying ${migration.version}: ${migration.name}`);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Execute migration SQL
        await client.query(migration.sql);

        // Record migration
        await client.query(
          "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
          [migration.version, migration.name]
        );

        await client.query("COMMIT");
        appliedCount++;
        logInfo(`Migrations: ✓ ${migration.version} applied successfully: ${migration.name}`);
      } catch (err) {
        await client.query("ROLLBACK");
        logError(`Migrations: ✗ ${migration.version} failed: ${migration.name}`, err);
        throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${err}`);
      } finally {
        client.release();
      }
    }

    if (appliedCount === 0) {
      logInfo("Migrations: All migrations already applied, database is up to date");
    } else {
      logInfo(`Migrations: Successfully applied ${appliedCount} new migration(s)`);
    }
  } catch (err) {
    logError("Migrations: Migration process failed", err);
    throw err;
  }
}

