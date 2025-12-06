/**
 * InternalToolSet Basisklasse
 * 
 * Eigenentwickelte Backend-Tools im Toolbox-Prozess.
 * 
 * Eigenschaften:
 * - Eigener MCP-Server
 * - Lifecycle durch Toolbox gemanaged
 * - Start/Stop über UI möglich
 */

import { ToolSet, type ToolDescriptor, type HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";

/**
 * Abstrakte Basisklasse für InternalToolSets
 * 
 * InternalToolSets:
 * - Lifecycle wird von Toolbox gemanaged
 * - start() / stop() Methoden für Toolbox
 * - Start/Stop über UI möglich
 */
export abstract class InternalToolSet extends ToolSet {
  /**
   * Starte das InternalToolSet
   * Wird von der Toolbox aufgerufen
   */
  abstract start(): Promise<void>;

  /**
   * Stoppe das InternalToolSet
   * Wird von der Toolbox aufgerufen
   */
  abstract stop(): Promise<void>;

  /**
   * Prüfe ob das ToolSet läuft
   */
  abstract isRunning(): boolean;
}

