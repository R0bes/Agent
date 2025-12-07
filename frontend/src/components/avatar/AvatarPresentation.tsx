import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { AvatarStatus, AvatarPosition } from './types';
import { AVATAR_BASE_SIZE, AVATAR_MIN_SIZE } from './types';

interface AvatarPresentationProps {
  position: AvatarPosition;  // ZENTRUM-Koordinaten
  size: number;  // 0.25 - 1.75 (direkt)
  status: AvatarStatus;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onWheel?: (delta: number) => void;  // Mausrad für Skalierung
}

export const AvatarPresentation: React.FC<AvatarPresentationProps> = ({
  position,
  size,
  status,
  isDragging = false,
  onMouseDown,
  onClick,
  onContextMenu,
  onWheel
}) => {
  const avatarRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Berechne tatsächliche Größe in Pixeln
  const pixelSize = AVATAR_BASE_SIZE * size;
  
  // CSS-Klassen
  const statusClass = `persona-avatar-${status}`;
  const draggingClass = isDragging ? 'avatar-dragging' : '';

  // Mausrad-Handler für Skalierung - direkt auf dem Element
  const handleWheelEvent = useCallback((e: React.WheelEvent) => {
    if (!onWheel) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Delta: positiv = nach oben (vergrößern), negativ = nach unten (verkleinern)
    // Schrittweite: 1% der Range (0.25-1.75 = 1.5 Range, also 0.015 pro Schritt)
    const stepSize = 0.015; // 1% der Range
    const delta = e.deltaY > 0 ? -stepSize : stepSize;
    
    onWheel(delta);
  }, [onWheel]);

  // Zusätzlich: addEventListener für bessere Kompatibilität
  useEffect(() => {
    const element = avatarRef.current;
    if (!element || !onWheel) return;

    const handleWheel = (e: WheelEvent) => {
      // Prüfe ob Maus über Avatar ist
      const rect = element.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
      const radius = rect.width / 2;
      
      // Prüfe ob Maus innerhalb des Avatar-Kreises ist
      if (distance > radius) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Delta: positiv = nach oben (vergrößern), negativ = nach unten (verkleinern)
      const stepSize = 0.015; // 1% der Range
      const delta = e.deltaY > 0 ? -stepSize : stepSize;
      
      onWheel(delta);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [onWheel]);

  return (
    <div
      ref={avatarRef}
      className={`persona-avatar ${statusClass} ${draggingClass}`}
      style={{
        position: 'fixed',  // Immer fixed, unabhängig von Größe
        // Position ist das ZENTRUM - transform sorgt für korrekte Ausrichtung
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        // translate(-50%, -50%) sorgt dafür, dass left/top das Zentrum ist
        transform: isDragging 
          ? 'translate(-50%, -50%) scale(1.1)'  // Während Drag: leicht vergrößern
          : 'translate(-50%, -50%)',             // Normal: Zentrierung
        transformOrigin: 'center center',  // Zentrum bleibt konstant
        transition: isDragging 
          ? 'none'  // Keine Transition während Drag
          : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), ' +
            'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), ' +
            'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), ' +
            'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10000,  // Immer gleicher zIndex
        cursor: isDragging ? 'grabbing' : 'grab',  // Immer grab/grabbing
        userSelect: 'none',
        pointerEvents: 'auto'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={onMouseDown}  // Immer aktiv, unabhängig von Größe
      onWheel={handleWheelEvent}  // Mausrad für Skalierung
      onContextMenu={onContextMenu}
      title={`Status: ${status} | Size: ${(size * 100).toFixed(0)}% (${pixelSize.toFixed(0)}px)`}
    />
  );
};
