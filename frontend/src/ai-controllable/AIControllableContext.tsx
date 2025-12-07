import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
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
  // Use useRef for elements map to avoid unnecessary re-renders
  const elementsRef = useRef(new Map<string, AIControllableElement>());
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const register = useCallback((element: AIControllableElement) => {
    elementsRef.current.set(element.id, element);
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log('[AIControllable] Registered element:', element.id, element.type);
    }
  }, []);

  const unregister = useCallback((id: string) => {
    elementsRef.current.delete(id);
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log('[AIControllable] Unregistered element:', id);
    }
    setSelectedElementId(prev => prev === id ? null : prev);
  }, []);

  const getElement = useCallback((id: string) => {
    return elementsRef.current.get(id);
  }, []);

  const getAllElements = useCallback(() => {
    return Array.from(elementsRef.current.values());
  }, []);

  const getElementsByType = useCallback((type: AIControllableElementType) => {
    return Array.from(elementsRef.current.values()).filter(el => el.type === type);
  }, []);

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

