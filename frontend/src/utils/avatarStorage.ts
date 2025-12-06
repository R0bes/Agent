const STORAGE_KEY = "avatar_state";

export interface AvatarState {
  position: { x: number; y: number };
  minimized: boolean;
}

export function saveAvatarState(state: AvatarState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to save avatar state to localStorage", error);
  }
}

export function loadAvatarState(): AvatarState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.position &&
        typeof parsed.position.x === "number" &&
        typeof parsed.position.y === "number" &&
        typeof parsed.minimized === "boolean"
      ) {
        return parsed as AvatarState;
      }
    }
  } catch (error) {
    console.warn("Failed to load avatar state from localStorage", error);
  }
  return null;
}

export function clearAvatarState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear avatar state from localStorage", error);
  }
}

