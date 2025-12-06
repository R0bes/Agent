/**
 * ToolSet Abstrakte Basisklasse
 * 
 * Logische Gruppe von Tools + MCP-Server.
 * Jedes ToolSet wird als eigener MCP-Server präsentiert.
 */

import type { ToolContext, ToolResult } from "../types";

/**
 * Tool Descriptor - beschreibt ein einzelnes Tool innerhalb eines ToolSets
 */
export interface ToolDescriptor {
  name: string;
  description: string;
  shortDescription: string;
  parameters?: Record<string, unknown>;
  examples?: any[];
}

/**
 * Health Status eines ToolSets
 */
export interface HealthStatus {
  status: "healthy" | "unhealthy" | "unknown";
  lastCheck?: string;
  error?: string;
}

/**
 * Abstrakte ToolSet Basisklasse
 * 
 * Implementiert MCP-Server Protokoll:
 * - listTools() - Liste aller Tools in diesem ToolSet
 * - callTool() - Tool ausführen
 * - checkHealth() - Health Check
 */
export abstract class ToolSet {
  /**
   * Eindeutige ID des ToolSets
   */
  abstract readonly id: string;

  /**
   * Name des ToolSets
   */
  abstract readonly name: string;

  /**
   * Liste aller Tools in diesem ToolSet
   * Entspricht MCP-Server tools/list
   */
  abstract listTools(): Promise<ToolDescriptor[]>;

  /**
   * Führe ein Tool aus diesem ToolSet aus
   * Entspricht MCP-Server tools/call
   */
  abstract callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult>;

  /**
   * Health Check für dieses ToolSet
   * Entspricht MCP-Server health check
   */
  abstract checkHealth(): Promise<HealthStatus>;
}

