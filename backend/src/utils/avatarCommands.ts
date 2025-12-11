/**
 * Avatar Commands Utility
 * 
 * Provides a way to send avatar commands without importing server.ts.
 * Uses the Event Bus to send commands, which the server listens to.
 */

import { eventBus } from "../events/eventBus";
import { logDebug, logWarn } from "./logger";

export interface AvatarCommand {
  command: 'move' | 'capability' | 'expression' | 'action' | 'set_mode' | 'set_size';
  target?: { x: number; y: number };
  capabilityId?: string;
  mode?: 'small' | 'large';
  size?: number;
  args?: Record<string, any>;
}

/**
 * Send avatar command via Event Bus
 * The server listens to this event and forwards it via Socket.IO
 */
export function sendAvatarCommand(command: AvatarCommand): void {
  logDebug("Avatar Commands: Sending avatar command via event bus", { command });
  eventBus.emit('avatar_command', { type: 'avatar_command', payload: command });
}

