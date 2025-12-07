import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import type { AIControllableElement, AIControllableElementType } from './types';

interface AIControllableContextType {
  register: (element: AIControllableElement) => void;
  unregister: (id: string) => void;
  getElement: (id: string) => AIControllableElement | undefined;
  getAllElements: () => AIControllableElement[];
  getElementsByType: (type: AIControllableElementType) => AIControllableElement[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  activatedElementId: string | null;
  setActivatedElementId: (id: string | null) => void;
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
  const [activatedElementId, setActivatedElementId] = useState<string | null>(null);

  const register = useCallback((element: AIControllableElement) => {
    const wasRegistered = elementsRef.current.has(element.id);
    elementsRef.current.set(element.id, element);
    // Only log if element was not already registered (to avoid spam)
    if (!wasRegistered && process.env.NODE_ENV === 'development') {
      console.log('[AIControllable] Registered element:', element.id, element.type);
    }
  }, []);

  const unregister = useCallback((id: string) => {
    const wasRegistered = elementsRef.current.has(id);
    const element = elementsRef.current.get(id);
    elementsRef.current.delete(id);
    // Only log if element was actually registered (to avoid spam)
    if (wasRegistered && process.env.NODE_ENV === 'development') {
      console.log('[AIControllable] Unregistered element:', id);
    }
    // Cleanup: Remove CSS classes when unregistering
    if (element) {
      // Call select with null to cleanup (element should handle cleanup in select)
      // Actually, we'll let the element handle cleanup in its unregister cleanup
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

  // Call select() method when selectedElementId changes
  useEffect(() => {
    // Remove selection from all elements first
    elementsRef.current.forEach((element, id) => {
      if (id !== selectedElementId) {
        // Element should handle deselection in its select() method
        // For now, we'll just call select on the newly selected element
      }
    });
    
    // Call select() on the newly selected element
    if (selectedElementId) {
      const element = elementsRef.current.get(selectedElementId);
      if (element && element.select) {
        element.select();
      }
    } else {
      // When deselected, remove classes from all elements
      // Elements should handle this in their select() implementation
      // For now, we'll let each element handle its own cleanup
    }
  }, [selectedElementId]);

  return (
    <AIControllableContext.Provider
      value={{
        register,
        unregister,
        getElement,
        getAllElements,
        getElementsByType,
        selectedElementId,
        setSelectedElementId,
        activatedElementId,
        setActivatedElementId
      }}
    >
      {children}
    </AIControllableContext.Provider>
  );
};

