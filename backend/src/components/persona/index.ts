/**
 * Persona Component
 * 
 * Implements Service interface using AbstractService base class.
 * - Service: Core persona service that processes messages and coordinates with tools
 */

import type { Component } from "../types";

// Export service class for Execution Service registration
export { ThreadedPersonaService } from "./personaService";

// Export message handler for use by service
export { handleSourceMessage, type ChatMessage } from "./messageHandler";

/**
 * Persona Component (Service)
 * Legacy export for compatibility during migration
 */
export const personaComponent: Component = {
  id: "persona",
  name: "Persona Component",
  description: "Core persona service that processes messages and coordinates with tools",
  service: null as any, // Will be set by Execution Service
  async initialize() {
    // Initialization handled by Execution Service
  },
  async shutdown() {
    // Shutdown handled by Execution Service
  }
};
