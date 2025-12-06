import { useEffect, useRef } from 'react';
import { useAIControllableContext } from './AIControllableContext';
import type { AIControllableElementType } from './types';

interface UseAIControllableOptions {
  id: string;
  type: AIControllableElementType;
  label: string;
  description?: string;
  onInteract: () => Promise<void>;
  getBounds: () => DOMRect;
}

export const useAIControllable = ({
  id,
  type,
  label,
  description,
  onInteract,
  getBounds
}: UseAIControllableOptions) => {
  const { register, unregister, selectedElementId, setSelectedElementId } = useAIControllableContext();
  const elementRef = useRef<{ select: () => void; interact: () => Promise<void> } | null>(null);

  useEffect(() => {
    const element = {
      id,
      type,
      label,
      description,
      select: () => {
        setSelectedElementId(id);
        console.log('[useAIControllable] Element selected:', id);
      },
      interact: async () => {
        console.log('[useAIControllable] Element interaction:', id);
        await onInteract();
      },
      getBounds
    };

    elementRef.current = element;
    register(element);

    return () => {
      unregister(id);
    };
  }, [id, type, label, description, onInteract, getBounds, register, unregister, setSelectedElementId]);

  const isSelected = selectedElementId === id;

  return {
    isSelected,
    select: () => {
      if (elementRef.current) {
        elementRef.current.select();
      }
    },
    interact: async () => {
      if (elementRef.current) {
        await elementRef.current.interact();
      }
    }
  };
};

