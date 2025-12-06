/**
 * ExternalToolSet
 * 
 * Wrapper für extern laufende MCP-Server.
 * 
 * Eigenschaften:
 * - Toolbox ist nur 'MCP-Server-Proxy'
 * - Kein Prozess-Lifecycle, nur etablieren und monitoren von Verbindung + Health
 * - Keine Start/Stop-Buttons (läuft extern)
 */

import { ToolSet, type ToolDescriptor, type HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

// TODO: Install @modelcontextprotocol/sdk
// import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
// import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ExternalToolSetConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  command?: string[];        // Für stdio
  url?: string;              // Für SSE
  env?: Record<string, string>;
}

/**
 * ExternalToolSet - Wrapper für externe MCP-Server
 * 
 * Toolbox ist MCP-Client für externe Server.
 * Kein Prozess-Lifecycle, nur Verbindungs-Ebene.
 */
export class ExternalToolSet extends ToolSet {
  readonly id: string;
  readonly name: string;
  private config: ExternalToolSetConfig;
  // private client: Client | null = null;
  private connected = false;
  private lastError?: string;

  constructor(config: ExternalToolSetConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.config = config;
  }

  /**
   * Verbinde zum externen MCP-Server
   * (Nicht start/stop, da der Server extern läuft)
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // TODO: Implement MCP Client connection
      // if (this.config.transport === 'stdio' && this.config.command) {
      //   const transport = new StdioClientTransport({
      //     command: this.config.command[0],
      //     args: this.config.command.slice(1),
      //     env: this.config.env
      //   });
      //   this.client = new Client({
      //     name: `agent-${this.id}`,
      //     version: '1.0.0'
      // }, { capabilities: {} });
      //   await this.client.connect(transport);
      // } else if (this.config.transport === 'sse' && this.config.url) {
      //   const transport = new SSEClientTransport(new URL(this.config.url));
      //   this.client = new Client({
      //     name: `agent-${this.id}`,
      //     version: '1.0.0'
      // }, { capabilities: {} });
      //   await this.client.connect(transport);
      // }

      this.connected = true;
      this.lastError = undefined;
      logInfo("ExternalToolSet: Connected", {
        toolSetId: this.id,
        toolSetName: this.name
      });
    } catch (err) {
      this.connected = false;
      this.lastError = err instanceof Error ? err.message : String(err);
      logError("ExternalToolSet: Failed to connect", err, {
        toolSetId: this.id,
        toolSetName: this.name
      });
      throw err;
    }
  }

  /**
   * Trenne Verbindung zum externen MCP-Server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      // TODO: Implement MCP Client disconnection
      // if (this.client) {
      //   await this.client.close();
      //   this.client = null;
      // }

      this.connected = false;
      logInfo("ExternalToolSet: Disconnected", {
        toolSetId: this.id,
        toolSetName: this.name
      });
    } catch (err) {
      logError("ExternalToolSet: Failed to disconnect", err, {
        toolSetId: this.id,
        toolSetName: this.name
      });
      throw err;
    }
  }

  /**
   * Liste aller Tools vom externen MCP-Server
   */
  async listTools(): Promise<ToolDescriptor[]> {
    if (!this.connected) {
      throw new Error(`ExternalToolSet "${this.name}" is not connected`);
    }

    try {
      // TODO: Implement MCP tools/list request
      // const response = await this.client!.request('tools/list', {});
      // const tools = response.tools || [];
      // return tools.map((tool: any) => ({
      //   name: tool.name,
      //   description: tool.description || '',
      //   shortDescription: tool.description || '',
      //   parameters: tool.inputSchema || {}
      // }));

      // Placeholder
      return [];
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      logError("ExternalToolSet: Failed to list tools", err, {
        toolSetId: this.id
      });
      throw err;
    }
  }

  /**
   * Führe ein Tool über MCP aus
   */
  async callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    if (!this.connected) {
      return {
        ok: false,
        error: `ExternalToolSet "${this.name}" is not connected`
      };
    }

    try {
      // TODO: Implement MCP tools/call request
      // const response = await this.client!.request('tools/call', {
      //   name,
      //   arguments: args
      // });
      // const content = response.content?.[0];
      // if (content?.type === 'text') {
      //   const data = JSON.parse(content.text);
      //   return { ok: true, data };
      // }
      // return { ok: true, data: response };

      // Placeholder
      return {
        ok: false,
        error: "MCP Client not yet implemented"
      };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: this.lastError
      };
    }
  }

  /**
   * Health Check für externes ToolSet
   */
  async checkHealth(): Promise<HealthStatus> {
    if (!this.connected) {
      return {
        status: "unhealthy",
        error: "Not connected"
      };
    }

    try {
      // Test connection by listing tools
      await this.listTools();
      return {
        status: "healthy",
        lastCheck: new Date().toISOString()
      };
    } catch (err) {
      return {
        status: "unhealthy",
        lastCheck: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Prüfe ob verbunden
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Hole letzten Fehler
   */
  getLastError(): string | undefined {
    return this.lastError;
  }
}

