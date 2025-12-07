const STORAGE_KEY = "avatar_state";

export interface AvatarState {
  position: { x: number; y: number };
  size: number;  // 0.25 - 1.75 (direkt)
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
        typeof parsed.position.y === "number"
      ) {
        // Migration: Wenn minimized vorhanden, konvertiere zu size
        if (typeof parsed.minimized === "boolean") {
          return {
            position: parsed.position,
            size: parsed.minimized ? 0.25 : 1.0
          };
        }
        // Neue Struktur: size vorhanden
        if (typeof parsed.size === "number" && parsed.size >= 0.25 && parsed.size <= 1.75) {
          return parsed as AvatarState;
        }
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

