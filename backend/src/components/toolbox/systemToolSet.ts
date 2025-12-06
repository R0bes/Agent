/**
 * SystemToolSet Basisklasse
 * 
 * Systemnahe Funktionen der KI selbst.
 * 
 * Eigenschaften:
 * - Lifecycle nicht durch Toolbox, sondern durch das restliche System
 * - Keine Start/Stop-Buttons im Frontend
 * - Registrieren sich automatisch beim Systemstart
 */

import { ToolSet, type ToolDescriptor, type HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";

/**
 * Abstrakte Basisklasse für SystemToolSets
 * 
 * SystemToolSets:
 * - Registrieren sich automatisch beim Systemstart
 * - Kein Lifecycle-Management durch Toolbox
 * - Shallow Wrapper für normale Systemfunktionen
 * - Tools betreffen die KI selbst
 */
export abstract class SystemToolSet extends ToolSet {
  /**
   * SystemToolSets registrieren sich automatisch beim Systemstart.
   * Diese Methode wird vom Konstruktor aufgerufen.
   */
  protected register(): void {
    // TODO: Automatische Registrierung bei Toolbox
    // Wird in Toolbox Service implementiert
  }

  constructor() {
    super();
    // Automatische Registrierung beim Systemstart
    this.register();
  }
}

