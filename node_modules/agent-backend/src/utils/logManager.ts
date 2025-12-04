/**
 * Log Manager
 * 
 * Centralized log management:
 * - Collects logs from event bus
 * - Outputs to console
 * - Writes to log files with rotation
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eventBus } from "../events/eventBus";
import type { BaseEvent } from "../events/eventBus";
import { createLogEntry, formatLogForConsole, formatLogForFile, type LogEntry, type LogLevel } from "./logFormat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LogManagerConfig {
  logDir?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  consoleOutput?: boolean;
  fileOutput?: boolean;
  minLevel?: LogLevel; // Minimum log level to output
}

class LogManager {
  private logDir: string;
  private maxFileSize: number;
  private maxFiles: number;
  private consoleOutput: boolean;
  private fileOutput: boolean;
  private minLevel: LogLevel;
  private currentLogFile: string | null = null;
  private currentLogSize: number = 0;
  private logStore: LogEntry[] = [];
  private readonly MAX_STORE_SIZE = 1000;

  constructor(config: LogManagerConfig = {}) {
    this.logDir = config.logDir || path.join(__dirname, "../../logs");
    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = config.maxFiles || 5;
    this.consoleOutput = config.consoleOutput !== false;
    this.fileOutput = config.fileOutput !== false;
    this.minLevel = config.minLevel || "debug";
    
    this.initialize();
  }

  private async initialize() {
    // Create log directory if it doesn't exist
    if (this.fileOutput) {
      try {
        await fs.mkdir(this.logDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create log directory:", err);
        this.fileOutput = false;
      }
    }

    // Register event handlers
    this.registerEventHandlers();
  }

  private registerEventHandlers() {
    const logLevels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    
    for (const level of logLevels) {
      const eventType = `log_${level}` as const;
      eventBus.on(eventType, (event: BaseEvent) => {
        this.handleLogEvent(event);
      });
    }
  }

  private async handleLogEvent(event: BaseEvent) {
    const entry = event.payload as LogEntry;
    
    // Check minimum log level
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Store in memory
    this.logStore.push(entry);
    if (this.logStore.length > this.MAX_STORE_SIZE) {
      this.logStore.shift();
    }

    // Output to console
    if (this.consoleOutput) {
      this.outputToConsole(entry);
    }

    // Write to file
    if (this.fileOutput) {
      await this.writeToFile(entry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    const minIndex = levels.indexOf(this.minLevel);
    const logIndex = levels.indexOf(level);
    return logIndex >= minIndex;
  }

  private outputToConsole(entry: LogEntry) {
    const formatted = formatLogForConsole(entry);
    
    switch (entry.level) {
      case "trace":
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
      case "fatal":
        console.error(formatted);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  private async writeToFile(entry: LogEntry) {
    try {
      const logFile = await this.getCurrentLogFile();
      const formatted = formatLogForFile(entry) + "\n";
      const size = Buffer.byteLength(formatted, "utf8");

      // Check if we need to rotate
      if (this.currentLogSize + size > this.maxFileSize) {
        await this.rotateLogFile();
        this.currentLogFile = await this.getCurrentLogFile();
        this.currentLogSize = 0;
      }

      await fs.appendFile(logFile, formatted, "utf8");
      this.currentLogSize += size;
    } catch (err) {
      console.error("Failed to write log to file:", err);
    }
  }

  private async getCurrentLogFile(): Promise<string> {
    if (this.currentLogFile && this.currentLogSize < this.maxFileSize) {
      return this.currentLogFile;
    }

    const today = new Date().toISOString().split("T")[0];
    const filename = `app-${today}.log`;
    const filepath = path.join(this.logDir, filename);

    // Check if file exists and get its size
    try {
      const stats = await fs.stat(filepath);
      this.currentLogSize = stats.size;
    } catch {
      this.currentLogSize = 0;
    }

    this.currentLogFile = filepath;
    return filepath;
  }

  private async rotateLogFile() {
    const files = await fs.readdir(this.logDir);
    const logFiles = files
      .filter(f => f.startsWith("app-") && f.endsWith(".log"))
      .sort()
      .reverse();

    // Keep only maxFiles - 1 (we're about to create a new one)
    const filesToDelete = logFiles.slice(this.maxFiles - 1);
    
    for (const file of filesToDelete) {
      try {
        await fs.unlink(path.join(this.logDir, file));
      } catch (err) {
        console.error(`Failed to delete old log file ${file}:`, err);
      }
    }
  }

  /**
   * Get stored logs (for API)
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let logs = [...this.logStore];
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    if (limit) {
      logs = logs.slice(-limit);
    }
    
    return logs;
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    this.logStore = [];
  }
}

// Create singleton instance
let logManagerInstance: LogManager | null = null;

export function initializeLogManager(config?: LogManagerConfig): LogManager {
  if (!logManagerInstance) {
    logManagerInstance = new LogManager(config);
  }
  return logManagerInstance;
}

export function getLogManager(): LogManager {
  if (!logManagerInstance) {
    throw new Error("LogManager not initialized. Call initializeLogManager() first.");
  }
  return logManagerInstance;
}

