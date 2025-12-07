import React, { useState, useEffect, useRef, useCallback } from "react";

export type AvatarEmotion = "happy" | "thinking" | "attentive" | "confused" | "excited" | null;
export type AvatarStatus = "disconnected" | "connecting" | "connected";

interface AvatarProps {
  status: AvatarStatus;
  position?: { x: number; y: number };
  emotion?: AvatarEmotion;
  minimized?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  renderInSidebar?: boolean; // If true, render as sidebar child instead of fixed position
  isArrowKeyControl?: boolean; // If true, arrow keys are controlling the avatar
}

export const Avatar: React.FC<AvatarProps> = ({ 
  status, 
  position: targetPosition, 
  emotion,
  minimized = false,
  onPositionChange,
  onDragEnd,
  onClick,
  onDoubleClick,
  onContextMenu,
  renderInSidebar = false,
  isArrowKeyControl = false
}) => {
  // Status LED size
  const STATUS_LED_SIZE = 10; // 10px diameter for LED
  
  // Calculate sidebar top position for LED (always at top center of sidebar)
  const getStatusLedPosition = useCallback((): { x: number; y: number } => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarContent = document.querySelector('.sidebar-content');
    
    if (sidebar && sidebarContent) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const contentRect = sidebarContent.getBoundingClientRect();
      
      // LED is always at top center of sidebar when minimized
      const ledX = sidebarRect.left + sidebarRect.width / 2;
      const ledY = contentRect.top + 16;  // Top of content + 16px padding
      
      return { x: ledX, y: ledY };
    }
    
    // Fallback
    return { x: 24, y: 16 };
  }, []);
  
  // Initialize with targetPosition if provided, otherwise use default
  const [currentPosition, setCurrentPosition] = useState(() => 
    targetPosition || { x: 24, y: window.innerHeight / 2 }
  );
  const [savedPosition, setSavedPosition] = useState(() => 
    targetPosition || { x: 24, y: window.innerHeight / 2 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); // Track if we're animating minimize/restore
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false); // Track if we actually dragged (not just clicked)
  const currentDragPositionRef = useRef<{ x: number; y: number } | null>(null); // Track current drag position
  const isDragEndingRef = useRef(false); // Track if drag is ending to prevent useEffect from resetting
  const avatarRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle minimize/restore with smooth animation (position + size)
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarContent = document.querySelector('.sidebar-content');
    
    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    if (minimized) {
      // Save current position before minimizing
      setSavedPosition(prev => {
        const current = avatarRef.current?.getBoundingClientRect();
        if (current) {
          return {
            x: current.left + current.width / 2,
            y: current.top + current.height / 2
          };
        }
        return prev;
      });
      
      // Expand sidebar by adding classes (LED mode: sidebar always expanded)
      if (sidebar) {
        sidebar.classList.add('has-minimized-avatar');
      }
      if (sidebarContent) {
        sidebarContent.classList.add('has-minimized-avatar');
      }
      
      // Wait for sidebar to expand, then animate to LED position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const ledPosition = getStatusLedPosition();
          
          // Mark as animating to block other useEffects
          setIsAnimating(true);
          
          // Enable transition before changing position and size
          if (avatarRef.current) {
            // Remove any existing transition first
            avatarRef.current.style.transition = 'none';
            // Get current position from DOM
            const currentRect = avatarRef.current.getBoundingClientRect();
            const currentPos = {
              x: currentRect.left + currentRect.width / 2,
              y: currentRect.top + currentRect.height / 2
            };
            // Set current position explicitly to ensure smooth transition
            avatarRef.current.style.left = `${currentPos.x}px`;
            avatarRef.current.style.top = `${currentPos.y}px`;
            // Use scale for size animation (better performance, not overridden by CSS)
            avatarRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
            
            // Force reflow
            void avatarRef.current.offsetWidth;
            
            // Now enable transition for position and transform (scale)
            avatarRef.current.style.transition = 
              'left 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
              'top 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
              'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Force another reflow to ensure transition is applied
            void avatarRef.current.offsetWidth;
          }
          
          // Now change position and scale - this will trigger the animation
          setCurrentPosition(ledPosition);
          
          // Update scale to 0.25 (10px / 40px = 0.25)
          requestAnimationFrame(() => {
            if (avatarRef.current) {
              avatarRef.current.style.transform = 'translate(-50%, -50%) scale(0.25)';
            }
          });
          
          // Clear animation flag after animation completes
          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
            if (avatarRef.current) {
              avatarRef.current.style.transition = '';
            }
            animationTimeoutRef.current = null;
          }, 2500);
        });
      });
    } else {
      // Get LED position before collapsing sidebar
      const ledPosition = getStatusLedPosition();
      
      // Mark as animating to block other useEffects
      setIsAnimating(true);
      
      // Set initial position and scale to LED (without transition)
      if (avatarRef.current) {
        avatarRef.current.style.transition = 'none';
        avatarRef.current.style.left = `${ledPosition.x}px`;
        avatarRef.current.style.top = `${ledPosition.y}px`;
        avatarRef.current.style.transform = 'translate(-50%, -50%) scale(0.25)';
      }
      setCurrentPosition(ledPosition);
      
      // Collapse sidebar by removing classes (Avatar mode: sidebar can collapse)
      if (sidebar) {
        sidebar.classList.remove('has-minimized-avatar');
      }
      if (sidebarContent) {
        sidebarContent.classList.remove('has-minimized-avatar');
      }
      
      // Animate to saved position and size
      if (savedPosition) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Enable transition before changing position and scale
            if (avatarRef.current) {
              // Force reflow
              void avatarRef.current.offsetWidth;
              
              // Now enable transition for position and transform (scale)
              avatarRef.current.style.transition = 
                'left 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                'top 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
              
              // Force another reflow to ensure transition is applied
              void avatarRef.current.offsetWidth;
            }
            
            // Now change position - this will trigger the animation
            setCurrentPosition(savedPosition);
            
            // Update scale back to 1 (full size)
            requestAnimationFrame(() => {
              if (avatarRef.current) {
                avatarRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
              }
            });
            
            if (onPositionChange) {
              onPositionChange(savedPosition);
            }
            
            // Clear animation flag after animation completes
            animationTimeoutRef.current = setTimeout(() => {
              setIsAnimating(false);
              if (avatarRef.current) {
                avatarRef.current.style.transition = '';
              }
              animationTimeoutRef.current = null;
            }, 2500);
          });
        });
      } else {
        setIsAnimating(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimized]);

  // Smooth movement to target position (only if not dragging and not minimized)
  // COMPLETELY DISABLED during drag, drag ending, and animations
  useEffect(() => {
    // Don't do anything if we're dragging, drag is ending, minimized, or animating
    if (isDragging || isDragEndingRef.current || minimized || isAnimating) {
      return;
    }
    
    if (targetPosition) {
      // Only update if targetPosition is actually different from current position
      const posChanged = Math.abs(targetPosition.x - currentPosition.x) > 1 || 
                         Math.abs(targetPosition.y - currentPosition.y) > 1;
      
      // IMPORTANT: If targetPosition matches currentPosition (within 1px), don't do anything
      // This prevents resetting position after drag-end when parent state syncs
      if (!posChanged) {
        return;
      }
      
      if (posChanged) {
        console.log('[Avatar] Moving to target:', targetPosition);
        setCurrentPosition(targetPosition);
        setSavedPosition(targetPosition);
      }
    }
  }, [targetPosition, isDragging, minimized, isAnimating, currentPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (minimized) return;
    if (renderInSidebar) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Reset drag state
    hasDraggedRef.current = false;
    
    // Store initial mouse position to detect actual drag movement
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    
    // Calculate offset from mouse to center of avatar
    // Since the avatar uses transform: translate(-50%, -50%), 
    // currentPosition already represents the center point
    dragOffsetRef.current = {
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    };
    console.log('[Avatar] Drag offset calculated:', dragOffsetRef.current, 'from position:', currentPosition);
    
    // IMPORTANT: Disable transition IMMEDIATELY to prevent lag during drag
    // Also set will-change for GPU acceleration
    if (avatarRef.current) {
      avatarRef.current.style.transition = 'none';
      avatarRef.current.style.willChange = 'left, top, transform';
    }
    
    console.log('[Avatar] MouseDown - ready to drag');
    
    // Register global mouse move and up handlers
    const moveHandler = (moveEvent: MouseEvent) => {
      if (!dragStartPosRef.current) return;
      
      // Only start dragging if mouse moved more than 3px (to distinguish from clicks)
      const deltaX = Math.abs(moveEvent.clientX - dragStartPosRef.current.x);
      const deltaY = Math.abs(moveEvent.clientY - dragStartPosRef.current.y);
      const dragThreshold = 3;
      
      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        moveEvent.preventDefault();
        
        // Log only once when drag starts
        if (!hasDraggedRef.current) {
          console.log('[Avatar] Drag started');
        }
        
        hasDraggedRef.current = true;
        setIsDragging(true);
        
        // Calculate new position: mouse position minus offset
        // This keeps the relative position between mouse and avatar constant
        const newPosition = {
          x: moveEvent.clientX - dragOffsetRef.current.x,
          y: moveEvent.clientY - dragOffsetRef.current.y
        };
        
        // Constrain to viewport
        newPosition.x = Math.max(20, Math.min(window.innerWidth - 20, newPosition.x));
        newPosition.y = Math.max(20, Math.min(window.innerHeight - 20, newPosition.y));
        
        // Store position in ref for reliable access later (avoids closure issues)
        currentDragPositionRef.current = newPosition;
        
        // Update DOM directly FIRST for immediate visual feedback
        // (transition already disabled in handleMouseDown)
        if (avatarRef.current) {
          avatarRef.current.style.left = `${newPosition.x}px`;
          avatarRef.current.style.top = `${newPosition.y}px`;
        }
        
        // Update state
        setCurrentPosition(newPosition);
      }
    };
    
    const upHandler = () => {
      const wasDragging = hasDraggedRef.current;
      dragStartPosRef.current = null;
      document.removeEventListener('mousemove', moveHandler, { capture: true });
      document.removeEventListener('mouseup', upHandler, { capture: true });
      document.removeEventListener('mouseleave', upHandler, { capture: true });
      
      if (wasDragging) {
        // Mark that drag is ending to prevent useEffect from resetting position
        isDragEndingRef.current = true;
        
        // Get the final position from ref (most reliable - contains last drag position)
        const finalPosition = currentDragPositionRef.current || currentPosition;
        console.log('[Avatar] Drag ended at:', finalPosition);
        
        // Update state to match
        setCurrentPosition(finalPosition);
        
        // Re-enable transition AFTER state update
        if (avatarRef.current) {
          // Use requestAnimationFrame to ensure smooth re-enabling
          requestAnimationFrame(() => {
            if (avatarRef.current) {
              avatarRef.current.style.transition = '';
              avatarRef.current.style.willChange = 'auto';
            }
          });
        }
        
        // Notify parent of the new position (this will trigger targetPosition change)
        if (onDragEnd) {
          onDragEnd(finalPosition);
        }
        if (onPositionChange) {
          onPositionChange(finalPosition);
        }
        
        // Clear drag position ref
        currentDragPositionRef.current = null;
        
        // Wait for parent state to sync, then reset all drag flags
        setTimeout(() => {
          setIsDragging(false);
          hasDraggedRef.current = false;
          // Keep isDragEndingRef true longer to ensure useEffect doesn't run
          // until parent state is fully synced and useEffect has checked position match
          setTimeout(() => {
            isDragEndingRef.current = false;
            console.log('[Avatar] Reset all dragging state');
          }, 200); // Delay to ensure parent state sync and useEffect check complete
        }, 50);
      } else {
        // No drag occurred, re-enable transition immediately
        if (avatarRef.current) {
          avatarRef.current.style.transition = '';
          avatarRef.current.style.willChange = 'auto';
        }
        hasDraggedRef.current = false;
        currentDragPositionRef.current = null;
      }
    };
    
    // Register handlers with capture phase
    const options = { capture: true, passive: false };
    document.addEventListener('mousemove', moveHandler, options);
    document.addEventListener('mouseup', upHandler, options);
    document.addEventListener('mouseleave', upHandler, options);
  }, [minimized, renderInSidebar, currentPosition, onDragEnd, onPositionChange]);

  const handleClick = (e: React.MouseEvent) => {
    // Cancel any pending click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Only trigger click if we didn't drag
    if (!hasDraggedRef.current && !isDragging) {
      // Delay click to allow for double-click detection
      clickTimeoutRef.current = setTimeout(() => {
        if (!hasDraggedRef.current && !isDragging && onClick) {
          console.log('[Avatar] Click executed');
          onClick();
        }
        clickTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Cancel pending single click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Prevent default double-click behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Only trigger double-click if we didn't drag
    if (!isDragging && onDoubleClick) {
      console.log('[Avatar] DoubleClick executed');
      onDoubleClick();
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const statusClass = `persona-avatar-${status}`;
  const emotionClass = emotion ? `avatar-emotion-${emotion}` : "";
  const draggingClass = isDragging ? "avatar-dragging" : "";
  const minimizedClass = minimized ? "avatar-minimized" : "";

  // Use same element for both modes to enable smooth animation
  return (
    <div 
      ref={avatarRef}
      className={`persona-avatar ${statusClass} ${emotionClass} ${draggingClass} ${minimizedClass}`}
      style={{
        position: minimized ? 'absolute' : 'fixed',
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        // Size and transform are controlled via inline style in useEffect for animations
        // Don't set transition here to avoid conflicts
        zIndex: minimized ? 10001 : 10000,
        transform: isAnimating ? undefined : (minimized ? 'translate(-50%, -50%) scale(0.25)' : 'translate(-50%, -50%) scale(1)'),
        cursor: minimized ? 'pointer' : (isDragging ? 'grabbing' : 'grab'),
        userSelect: 'none',
        pointerEvents: 'auto',
        // Size is controlled by CSS classes, scale is used for animation
        // Don't set width/height here to avoid conflicts with CSS classes
      }}
      onMouseDown={minimized ? undefined : handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
      title={minimized 
        ? `Status: ${status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Disconnected"}\nDouble-click to restore`
        : `WebSocket: ${status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Disconnected"}\nClick to ${status === "connected" ? "poke" : "reconnect"}, Double-click to minimize, Right-click for menu`
      }
    />
  );
};

