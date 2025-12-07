import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarPresentation } from './AvatarPresentation';
import { useAvatarController } from './AvatarController';
import { registerAllCapabilities } from './registerCapabilities';
import type { AvatarStatus, AvatarPosition } from './types';
import { AVATAR_MIN_SIZE, AVATAR_MAX_SIZE, AVATAR_BASE_SIZE } from './types';

// Register all capabilities on module load
registerAllCapabilities();

interface AvatarProps {
  status: AvatarStatus;
  position?: AvatarPosition;  // ZENTRUM-Koordinaten
  size?: number;  // 0.25 - 1.75
  onPositionChange?: (position: AvatarPosition) => void;  // Zentrum
  onSizeChange?: (size: number) => void;
  onDragEnd?: (position: AvatarPosition) => void;  // Zentrum
  onContextMenu?: (e: React.MouseEvent) => void;  // AI-Menü
}

export const Avatar: React.FC<AvatarProps> = ({
  status,
  position: targetPosition,
  size: targetSize = 1.0,  // Default: 100%
  onPositionChange,
  onSizeChange,
  onDragEnd,
  onContextMenu
}) => {
  // State: Minimal
  const [currentPosition, setCurrentPosition] = useState<AvatarPosition>(() => {
    if (targetPosition) {
      return targetPosition;
    }
    // Default: Etwas weiter weg von der Ecke (Zentrum)
    const defaultSize = AVATAR_BASE_SIZE * 1.0; // 40px
    return { 
      x: defaultSize + 40,  // 80px vom linken Rand (Avatar beginnt bei 40px)
      y: defaultSize + 40    // 80px vom oberen Rand (Avatar beginnt bei 40px)
    };
  });
  const [currentSize, setCurrentSize] = useState<number>(() => {
    // Clamp initial size to valid range
    return Math.max(AVATAR_MIN_SIZE, Math.min(AVATAR_MAX_SIZE, targetSize));
  });
  const [isDragging, setIsDragging] = useState(false);

  // Refs für Drag
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Controller Hook
  useAvatarController({
    status,
    position: currentPosition,
    size: currentSize,
    onPositionChange: (pos) => {
      setCurrentPosition(pos);
      onPositionChange?.(pos);
    },
    onSizeChange: (newSize) => {
      // Clamp size to valid range
      const clampedSize = Math.max(AVATAR_MIN_SIZE, Math.min(AVATAR_MAX_SIZE, newSize));
      setCurrentSize(clampedSize);
      onSizeChange?.(clampedSize);
    },
    onCapabilityExecute: (capabilityId) => {
      console.log('[Avatar] Capability executed:', capabilityId);
    }
  });

  // Sync mit externen Props - nur wenn nicht am Draggen
  useEffect(() => {
    if (!isDragging && targetPosition) {
      const posChanged = Math.abs(targetPosition.x - currentPosition.x) > 1 ||
                         Math.abs(targetPosition.y - currentPosition.y) > 1;
      if (posChanged) {
        setCurrentPosition(targetPosition);
      }
    }
  }, [targetPosition, isDragging]); // currentPosition aus Dependencies entfernt, um Loop zu vermeiden

  useEffect(() => {
    if (!isDragging && targetSize !== undefined) {
      const clampedSize = Math.max(AVATAR_MIN_SIZE, Math.min(AVATAR_MAX_SIZE, targetSize));
      const sizeChanged = Math.abs(clampedSize - currentSize) > 0.01;
      if (sizeChanged) {
        setCurrentSize(clampedSize);
      }
    }
  }, [targetSize, isDragging, currentSize]);

  // Mausrad-Handler für Skalierung
  const handleWheel = useCallback((delta: number) => {
    // delta: -0.015 oder +0.015
    const newSize = Math.max(AVATAR_MIN_SIZE, Math.min(AVATAR_MAX_SIZE, currentSize + delta));
    setCurrentSize(newSize);
    onSizeChange?.(newSize);
  }, [currentSize, onSizeChange]);

  // Drag Handler - WICHTIG: Position ist das Zentrum
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Nur linke Maustaste
    
    e.preventDefault();
    e.stopPropagation();

    hasDraggedRef.current = false;
    
    // Speichere die Startposition für Offset-Berechnung
    const startPosition = { ...currentPosition };
    
    // Berechne Offset: Mausposition minus Avatar-Zentrum
    // Da position das Zentrum ist, ist der Offset einfach die Differenz
    dragOffsetRef.current = {
      x: e.clientX - startPosition.x,
      y: e.clientY - startPosition.y
    };

    let lastPosition: AvatarPosition = startPosition;

    const moveHandler = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startPosition.x - dragOffsetRef.current.x);
      const deltaY = Math.abs(moveEvent.clientY - startPosition.y - dragOffsetRef.current.y);
      
      if (deltaX > 3 || deltaY > 3) {
        hasDraggedRef.current = true;
        setIsDragging(true);

        // Neue Position: Mausposition minus Offset
        // Das gibt uns das neue Zentrum
        const pixelSize = AVATAR_BASE_SIZE * currentSize;
        const halfSize = pixelSize / 2;
        
        const newPosition: AvatarPosition = {
          x: Math.max(halfSize, Math.min(window.innerWidth - halfSize, moveEvent.clientX - dragOffsetRef.current.x)),
          y: Math.max(halfSize, Math.min(window.innerHeight - halfSize, moveEvent.clientY - dragOffsetRef.current.y))
        };

        lastPosition = newPosition;
        setCurrentPosition(newPosition);
      }
    };

    const upHandler = () => {
      const wasDragging = hasDraggedRef.current;
      document.removeEventListener('mousemove', moveHandler, { capture: true });
      document.removeEventListener('mouseup', upHandler, { capture: true });

      if (wasDragging) {
        // Verwende lastPosition statt currentPosition (React State ist asynchron)
        onDragEnd?.(lastPosition);
        onPositionChange?.(lastPosition);
        // Warte kurz, bevor isDragging auf false gesetzt wird, damit die Position nicht überschrieben wird
        setTimeout(() => setIsDragging(false), 100);
      } else {
        hasDraggedRef.current = false;
      }
    };

    document.addEventListener('mousemove', moveHandler, { capture: true, passive: false });
    document.addEventListener('mouseup', upHandler, { capture: true });
  }, [currentPosition, currentSize, onDragEnd, onPositionChange]);

  // Click Handler - ENTFERNT (Poke nur über Menü)
  // const handleClick = useCallback((e: React.MouseEvent) => {
  //   if (!hasDraggedRef.current && !isDragging && onClick) {
  //     onClick();
  //   }
  // }, [onClick, isDragging]);

  // Double-Click: NICHT implementiert (leer lassen)

  // Right-Click: AI-Menü
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e);
    }
  }, [onContextMenu]);

  return (
    <AvatarPresentation
      position={currentPosition}
      size={currentSize}
      status={status}
      isDragging={isDragging}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    />
  );
};

// Re-export types for backward compatibility
export type { AvatarStatus };
