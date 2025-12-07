export type AIControllableElementType = 'button' | 'panel' | 'menu' | 'input' | 'custom';

export interface AIControllableVisualSelectors {
  // CSS-Selektor für das Element, das die Outline bekommen soll (für AISelectionOverlay)
  outline?: string;
  // CSS-Selektor für das Icon, das leuchten soll
  icon?: string;
  // CSS-Selektor für weitere Elemente, die beim selected state eingefärbt werden sollen
  highlight?: string[];
}

export interface AIControllableElement {
  id: string;
  type: AIControllableElementType;
  label: string;
  description?: string;
  select: () => void;           // Visuelle Selektion
  interact: () => Promise<void>; // Ausführung der Aktion
  getBounds: () => DOMRect;      // Position für Avatar-Animation
  // Optionale visuelle Selektoren für selected/activated states
  visualSelectors?: AIControllableVisualSelectors;
}

