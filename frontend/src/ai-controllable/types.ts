export type AIControllableElementType = 'button' | 'panel' | 'menu' | 'input' | 'custom';

export interface AIControllableElement {
  id: string;
  type: AIControllableElementType;
  label: string;
  description?: string;
  select: () => void;           // Visuelle Selektion
  interact: () => Promise<void>; // Ausführung der Aktion
  getBounds: () => DOMRect;      // Position für Avatar-Animation
}

