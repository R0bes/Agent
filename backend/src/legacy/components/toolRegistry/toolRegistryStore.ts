/**
 * Persistent Storage for Tool Registry State
 * 
 * Manages the enable/disable status of all tools in a JSON file.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { logInfo, logDebug, logError, logWarn } from "../../../utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATE_FILE = join(__dirname, "../../../../tool-registry-state.json");

export interface ToolState {
  enabled: boolean;
  lastModified?: string;
}

export interface ToolRegistryState {
  tools: Record<string, ToolState>;
  version: string;
}

class ToolRegistryStore {
  private state: ToolRegistryState = {
    tools: {},
    version: "1.0"
  };
  private initialized = false;

  /**
   * Initialize the store - load state from file
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const data = await fs.readFile(STATE_FILE, "utf-8");
      this.state = JSON.parse(data);
      logInfo("Tool Registry Store: State loaded from file", {
        toolCount: Object.keys(this.state.tools).length
      });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // File doesn't exist yet - that's fine, we'll create it on first save
        logDebug("Tool Registry Store: No existing state file, starting fresh");
      } else {
        logWarn("Tool Registry Store: Failed to load state file", {
          error: err.message
        });
      }
    }

    this.initialized = true;
  }

  /**
   * Check if a tool is enabled
   * Default: true (all tools are enabled by default)
   */
  isToolEnabled(toolName: string): boolean {
    const toolState = this.state.tools[toolName];
    if (toolState === undefined) {
      return true; // Default: enabled
    }
    return toolState.enabled;
  }

  /**
   * Enable a tool
   */
  async enableTool(toolName: string): Promise<void> {
    if (!this.state.tools[toolName]) {
      this.state.tools[toolName] = {
        enabled: true,
        lastModified: new Date().toISOString()
      };
    } else {
      this.state.tools[toolName].enabled = true;
      this.state.tools[toolName].lastModified = new Date().toISOString();
    }

    await this.save();
    logInfo("Tool Registry Store: Tool enabled", { toolName });
  }

  /**
   * Disable a tool
   */
  async disableTool(toolName: string): Promise<void> {
    if (!this.state.tools[toolName]) {
      this.state.tools[toolName] = {
        enabled: false,
        lastModified: new Date().toISOString()
      };
    } else {
      this.state.tools[toolName].enabled = false;
      this.state.tools[toolName].lastModified = new Date().toISOString();
    }

    await this.save();
    logInfo("Tool Registry Store: Tool disabled", { toolName });
  }

  /**
   * Get all tool states
   */
  getAllToolStates(): Record<string, ToolState> {
    return { ...this.state.tools };
  }

  /**
   * Save state to file
   */
  private async save(): Promise<void> {
    try {
      await fs.writeFile(STATE_FILE, JSON.stringify(this.state, null, 2), "utf-8");
      logDebug("Tool Registry Store: State saved to file");
    } catch (err) {
      logError("Tool Registry Store: Failed to save state file", err);
      throw err;
    }
  }
}

export const toolRegistryStore = new ToolRegistryStore();











