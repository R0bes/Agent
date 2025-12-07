import React, { useEffect, useState } from 'react';
import { useAIControllableContext } from './AIControllableContext';

export const AISelectionOverlay: React.FC = () => {
  const { selectedElementId, activatedElementId, getElement } = useAIControllableContext();
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

  // Note: CSS classes are now managed by elements themselves in their select() method
  // This overlay is only for Avatar positioning, not visual styling

  useEffect(() => {
    // Overlay is now only for Avatar positioning, not visual styling
    // Visual styling is handled by elements themselves via CSS classes
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
        
        // Validate bounds: must have valid dimensions and position
        const hasValidBounds = bounds.width > 0 && 
                               bounds.height > 0 && 
                               !isNaN(bounds.left) && 
                               !isNaN(bounds.top) &&
                               isFinite(bounds.left) &&
                               isFinite(bounds.top);
        
        if (!hasValidBounds) {
          setOverlayStyle(prev => ({ ...prev, display: 'none' }));
          return;
        }
        
        // Check if element is in viewport (with some tolerance for off-screen elements)
        const isInViewport = bounds.left < window.innerWidth + 100 && 
                             bounds.top < window.innerHeight + 100 &&
                             bounds.right > -100 && 
                             bounds.bottom > -100;
        
        if (!isInViewport) {
          setOverlayStyle(prev => ({ ...prev, display: 'none' }));
          return;
        }
        
        // Try to find the actual DOM element to check visibility and get border-radius
        // Use visualSelectors.outline if provided, otherwise fallback to element ID or default logic
        let targetElement: HTMLElement | null = null;
        if (element.visualSelectors?.outline) {
          // Use the specified outline selector
          targetElement = document.querySelector(element.visualSelectors.outline) as HTMLElement;
        } else if (element.id === 'button-logs-open') {
          // Fallback for logs button
          targetElement = document.querySelector('.logs-panel-morph') as HTMLElement;
        } else {
          targetElement = document.getElementById(selectedElementId);
        }
        
        // Check if element is actually visible (not hidden by CSS)
        if (targetElement) {
          const computedStyle = window.getComputedStyle(targetElement);
          const isVisible = computedStyle.display !== 'none' && 
                           computedStyle.visibility !== 'hidden' &&
                           computedStyle.opacity !== '0';
          
          if (!isVisible) {
            setOverlayStyle(prev => ({ ...prev, display: 'none' }));
            return;
          }
        }
        
        // Determine border-radius from the target element (or its container for logs button)
        let borderRadius = '4px'; // default
        if (targetElement) {
          const computedStyle = window.getComputedStyle(targetElement);
          borderRadius = computedStyle.borderRadius || '4px';
        }
        
        // Overlay is now only for Avatar positioning, not visual styling
        // Hide overlay - visual styling is handled by CSS classes on elements
        setOverlayStyle(prev => ({ ...prev, display: 'none' }));
      } catch (err) {
        console.error('[AISelectionOverlay] Error getting bounds:', err);
        setOverlayStyle(prev => ({ ...prev, display: 'none' }));
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

