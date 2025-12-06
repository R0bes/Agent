import React, { useEffect, useState } from 'react';
import { useAIControllableContext } from './AIControllableContext';

export const AISelectionOverlay: React.FC = () => {
  const { selectedElementId, getElement } = useAIControllableContext();
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({
    display: 'none',
    position: 'fixed',
    border: '2px solid #6366f1',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: 10002,
    transition: 'all 0.2s ease',
    boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
  });

  useEffect(() => {
    if (!selectedElementId) {
      setOverlayStyle(prev => ({ ...prev, display: 'none' }));
      return;
    }

    const element = getElement(selectedElementId);
    if (!element) {
      return;
    }

    const updateOverlay = () => {
      try {
        const bounds = element.getBounds();
        if (bounds.width > 0 && bounds.height > 0) {
          setOverlayStyle({
            display: 'block',
            position: 'fixed',
            left: `${bounds.left}px`,
            top: `${bounds.top}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
            border: '2px solid #6366f1',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 10002,
            transition: 'all 0.2s ease',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
          });
        }
      } catch (err) {
        console.error('[AISelectionOverlay] Error getting bounds:', err);
      }
    };

    updateOverlay();
    const interval = setInterval(updateOverlay, 100); // Update every 100ms

    return () => {
      clearInterval(interval);
    };
  }, [selectedElementId, getElement]);

  return <div style={overlayStyle} />;
};

