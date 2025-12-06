export type AvatarPresentationMode = 'small' | 'large';
export type AvatarStatus = 'disconnected' | 'connecting' | 'connected';
export type AvatarEmotion = 'happy' | 'thinking' | 'attentive' | 'confused' | 'excited' | null;

export interface AvatarPosition {
  x: number;
  y: number;
}

export interface AvatarContext {
  status: AvatarStatus;
  position: AvatarPosition;
  mode: AvatarPresentationMode;
  sendToBackend: (event: { type: string; payload: any }) => void;
}

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
  command: 'move' | 'capability' | 'expression' | 'action';
  target?: AvatarPosition;
  capabilityId?: string;
  args?: Record<string, any>;
}

export interface AvatarState {
  status: AvatarStatus;
  position: AvatarPosition;
  mode: AvatarPresentationMode;
  availableCapabilities: string[];
}

