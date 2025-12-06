import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AIControllableElement, AIControllableElementType } from './types';

interface AIControllableContextType {
  register: (element: AIControllableElement) => void;
  unregister: (id: string) => void;
  getElement: (id: string) => AIControllableElement | undefined;
  getAllElements: () => AIControllableElement[];
  getElementsByType: (type: AIControllableElementType) => AIControllableElement[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
}

const AIControllableContext = createContext<AIControllableContextType | null>(null);

export const useAIControllableContext = () => {
  const context = useContext(AIControllableContext);
  if (!context) {
    throw new Error('useAIControllableContext must be used within AIControllableProvider');
  }
  return context;
};

export const AIControllableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [elements] = useState(new Map<string, AIControllableElement>());
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const register = useCallback((element: AIControllableElement) => {
    elements.set(element.id, element);
    console.log('[AIControllable] Registered element:', element.id, element.type);
  }, [elements]);

  const unregister = useCallback((id: string) => {
    elements.delete(id);
    console.log('[AIControllable] Unregistered element:', id);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }, [elements, selectedElementId]);

  const getElement = useCallback((id: string) => {
    return elements.get(id);
  }, [elements]);

  const getAllElements = useCallback(() => {
    return Array.from(elements.values());
  }, [elements]);

  const getElementsByType = useCallback((type: AIControllableElementType) => {
    return Array.from(elements.values()).filter(el => el.type === type);
  }, [elements]);

  return (
    <AIControllableContext.Provider
      value={{
        register,
        unregister,
        getElement,
        getAllElements,
        getElementsByType,
        selectedElementId,
        setSelectedElementId
      }}
    >
      {children}
    </AIControllableContext.Provider>
  );
};

