import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarPresentation } from './AvatarPresentation';
import { useAvatarController } from './AvatarController';
import { registerAllCapabilities } from './registerCapabilities';
import type { AvatarPresentationMode, AvatarStatus, AvatarEmotion, AvatarPosition } from './types';

// Register all capabilities on module load
registerAllCapabilities();

interface AvatarProps {
  status: AvatarStatus;
  position?: AvatarPosition;
  emotion?: AvatarEmotion;
  mode?: AvatarPresentationMode;
  onPositionChange?: (position: AvatarPosition) => void;
  onDragEnd?: (position: AvatarPosition) => void;
  onModeChange?: (mode: AvatarPresentationMode) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isArrowKeyControl?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  status,
  position: targetPosition,
  emotion,
  mode: externalMode,
  onPositionChange,
  onDragEnd,
  onModeChange: externalOnModeChange,
  onClick,
  onDoubleClick,
  onContextMenu,
  isArrowKeyControl = false
}) => {
  // Internal state
  const [internalMode, setInternalMode] = useState<AvatarPresentationMode>(externalMode || 'large');
  const mode = externalMode ?? internalMode;

  const [currentPosition, setCurrentPosition] = useState<AvatarPosition>(() =>
    targetPosition || { x: 24, y: window.innerHeight / 2 }
  );
  const [savedPosition, setSavedPosition] = useState<AvatarPosition>(() =>
    targetPosition || { x: 24, y: window.innerHeight / 2 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef<AvatarPosition | null>(null);
  const hasDraggedRef = useRef(false);
  const currentDragPositionRef = useRef<AvatarPosition | null>(null);
  const isDragEndingRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate sidebar position for small mode
  const getSmallModePosition = useCallback((): AvatarPosition => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarContent = document.querySelector('.sidebar-content');

    if (sidebar && sidebarContent) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const contentRect = sidebarContent.getBoundingClientRect();
      const ledX = sidebarRect.left + sidebarRect.width / 2;
      const ledY = contentRect.top + 16;
      return { x: ledX, y: ledY };
    }

    return { x: 24, y: 16 };
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((newMode: AvatarPresentationMode) => {
    if (newMode === 'small') {
      // Save current position before switching to small
      setSavedPosition(currentPosition);
      setCurrentPosition(getSmallModePosition());
    } else {
      // Restore saved position when switching to large
      if (savedPosition) {
        setCurrentPosition(savedPosition);
      }
    }

    if (externalOnModeChange) {
      externalOnModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  }, [currentPosition, savedPosition, getSmallModePosition, externalOnModeChange]);

  // Use controller hook
  useAvatarController({
    status,
    mode,
    position: currentPosition,
    onModeChange: handleModeChange,
    onPositionChange: (pos) => {
      setCurrentPosition(pos);
      if (onPositionChange) {
        onPositionChange(pos);
      }
    },
    onCapabilityExecute: (capabilityId) => {
      console.log('[Avatar] Capability executed:', capabilityId);
    }
  });

  // Handle target position changes (from parent)
  useEffect(() => {
    if (isDragging || isDragEndingRef.current || mode === 'small' || isAnimating) {
      return;
    }

    if (targetPosition) {
      const posChanged = Math.abs(targetPosition.x - currentPosition.x) > 1 ||
                         Math.abs(targetPosition.y - currentPosition.y) > 1;

      if (posChanged) {
        setCurrentPosition(targetPosition);
        setSavedPosition(targetPosition);
      }
    }
  }, [targetPosition, isDragging, mode, isAnimating, currentPosition]);

  // Drag and drop handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (mode === 'small') return;

    e.preventDefault();
    e.stopPropagation();

    hasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = {
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    };

    const moveHandler = (moveEvent: MouseEvent) => {
      if (!dragStartPosRef.current) return;

      const deltaX = Math.abs(moveEvent.clientX - dragStartPosRef.current.x);
      const deltaY = Math.abs(moveEvent.clientY - dragStartPosRef.current.y);
      const dragThreshold = 3;

      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        moveEvent.preventDefault();
        hasDraggedRef.current = true;
        setIsDragging(true);

        const newPosition: AvatarPosition = {
          x: Math.max(20, Math.min(window.innerWidth - 20, moveEvent.clientX - dragOffsetRef.current.x)),
          y: Math.max(20, Math.min(window.innerHeight - 20, moveEvent.clientY - dragOffsetRef.current.y))
        };

        currentDragPositionRef.current = newPosition;
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
        isDragEndingRef.current = true;
        const finalPosition = currentDragPositionRef.current || currentPosition;
        setCurrentPosition(finalPosition);

        if (onDragEnd) {
          onDragEnd(finalPosition);
        }
        if (onPositionChange) {
          onPositionChange(finalPosition);
        }

        currentDragPositionRef.current = null;

        setTimeout(() => {
          setIsDragging(false);
          hasDraggedRef.current = false;
          setTimeout(() => {
            isDragEndingRef.current = false;
          }, 200);
        }, 50);
      } else {
        hasDraggedRef.current = false;
        currentDragPositionRef.current = null;
      }
    };

    const options = { capture: true, passive: false };
    document.addEventListener('mousemove', moveHandler, options);
    document.addEventListener('mouseup', upHandler, options);
    document.addEventListener('mouseleave', upHandler, options);
  }, [mode, currentPosition, onDragEnd, onPositionChange]);

  const handleClick = (e: React.MouseEvent) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (!hasDraggedRef.current && !isDragging) {
      clickTimeoutRef.current = setTimeout(() => {
        if (!hasDraggedRef.current && !isDragging && onClick) {
          onClick();
        }
        clickTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    e.preventDefault();
    e.stopPropagation();

    if (!isDragging) {
      handleModeChange(mode === 'small' ? 'large' : 'small');
      if (onDoubleClick) {
        onDoubleClick();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AvatarPresentation
      mode={mode}
      status={status}
      position={currentPosition}
      emotion={emotion}
      isAnimating={isAnimating}
      isDragging={isDragging}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
    />
  );
};

// Re-export types for backward compatibility
export type { AvatarPresentationMode, AvatarStatus, AvatarEmotion };

