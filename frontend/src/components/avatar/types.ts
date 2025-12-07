export type AvatarStatus = 'disconnected' | 'connecting' | 'connected';

// Größenkonstanten
export const AVATAR_MIN_SIZE = 0.25;  // 25% = 10px (40px * 0.25)
export const AVATAR_MAX_SIZE = 1.75;  // 175% = 70px (40px * 1.75)
export const AVATAR_BASE_SIZE = 40;   // Basis-Größe in Pixeln

// Position bezieht sich auf das ZENTRUM des Avatars
export interface AvatarPosition {
  x: number;  // Zentrum X-Koordinate
  y: number;  // Zentrum Y-Koordinate
}

// AvatarContext für Capabilities (später implementiert)
export interface AvatarContext {
  status: AvatarStatus;
  position: AvatarPosition;  // Zentrum
  size: number;  // 0.25 - 1.75 (direkt)
  sendToBackend: (event: { type: string; payload: any }) => void;
  setSize?: (size: number) => void;  // Statt setMode
  moveAvatar?: (position: AvatarPosition) => void; // Für Mimikri-Bewegung
  setMimikriIcon?: (icon: string | null) => void;
  setMimikriWall?: (wall: 'left' | 'right' | 'top' | 'bottom' | null) => void;
  setMimikriStartPosition?: (pos: AvatarPosition | null) => void;
  setMimikriStartSize?: (size: number | null) => void;
  getMimikriStartPosition?: () => AvatarPosition | null;
  getMimikriStartSize?: () => number | null;
}

// Capabilities (später implementiert)
export type AvatarCapabilityCategory = 'expression' | 'action';

export interface AvatarCapability {
  id: string;
  category: AvatarCapabilityCategory;
  name: string;
  description: string;
  hotkey?: string; // Optional: Hotkey-Trigger (e.g., "a+2")
  execute: (context: AvatarContext) => Promise<void>;
}

export interface AvatarCommand {
  command: 'move' | 'capability' | 'expression' | 'action' | 'set_size' | 'resize';
  target?: AvatarPosition;  // Zentrum
  size?: number;  // 0.25 - 1.75
  capabilityId?: string;
  args?: Record<string, any>;
}

export interface AvatarState {
  status: AvatarStatus;
  position: AvatarPosition;  // Zentrum
  size: number;  // 0.25 - 1.75 (direkt)
  availableCapabilities: string[];
}

