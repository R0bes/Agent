import React, { useRef, useEffect } from 'react';
import type { AvatarPresentationMode, AvatarStatus, AvatarEmotion, AvatarPosition } from './types';

interface AvatarPresentationProps {
  mode: AvatarPresentationMode;
  status: AvatarStatus;
  position: AvatarPosition;
  emotion?: AvatarEmotion;
  isAnimating?: boolean;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const AvatarPresentation: React.FC<AvatarPresentationProps> = ({
  mode,
  status,
  position,
  emotion,
  isAnimating = false,
  isDragging = false,
  onMouseDown,
  onClick,
  onDoubleClick,
  onContextMenu
}) => {
  const avatarRef = useRef<HTMLDivElement>(null);

  const statusClass = `persona-avatar-${status}`;
  const emotionClass = emotion ? `avatar-emotion-${emotion}` : '';
  const draggingClass = isDragging ? 'avatar-dragging' : '';
  const minimizedClass = mode === 'small' ? 'avatar-minimized' : '';
  const sidebarLedClass = mode === 'small' ? 'avatar-sidebar-led' : '';

  // Handle mode change animation (small <-> large)
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarContent = document.querySelector('.sidebar-content');

    if (mode === 'small') {
      // Expand sidebar
      if (sidebar) {
        sidebar.classList.add('has-minimized-avatar');
      }
      if (sidebarContent) {
        sidebarContent.classList.add('has-minimized-avatar');
      }

      // Animate to small size
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (avatarRef.current) {
            const sidebarRect = sidebar?.getBoundingClientRect();
            const contentRect = sidebarContent?.getBoundingClientRect();
            
            if (sidebarRect && contentRect) {
              const ledX = sidebarRect.left + sidebarRect.width / 2;
              const ledY = contentRect.top + 16;

              avatarRef.current.style.transition = 'none';
              const currentRect = avatarRef.current.getBoundingClientRect();
              const currentPos = {
                x: currentRect.left + currentRect.width / 2,
                y: currentRect.top + currentRect.height / 2
              };
              avatarRef.current.style.left = `${currentPos.x}px`;
              avatarRef.current.style.top = `${currentPos.y}px`;
              avatarRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
              void avatarRef.current.offsetWidth;

              avatarRef.current.style.transition = 
                'left 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                'top 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
              void avatarRef.current.offsetWidth;

              avatarRef.current.style.left = `${ledX}px`;
              avatarRef.current.style.top = `${ledY}px`;
              avatarRef.current.style.transform = 'translate(-50%, -50%) scale(0.25)';
            }
          }
        });
      });
    } else {
      // Collapse sidebar
      if (sidebar) {
        sidebar.classList.remove('has-minimized-avatar');
      }
      if (sidebarContent) {
        sidebarContent.classList.remove('has-minimized-avatar');
      }

      // Animate to large size
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (avatarRef.current) {
            avatarRef.current.style.transition = 
              'left 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
              'top 2.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
              'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
            void avatarRef.current.offsetWidth;

            avatarRef.current.style.left = `${position.x}px`;
            avatarRef.current.style.top = `${position.y}px`;
            avatarRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
          }
        });
      });
    }
  }, [mode, position]);

  return (
    <div
      ref={avatarRef}
      className={`persona-avatar ${statusClass} ${emotionClass} ${draggingClass} ${minimizedClass} ${sidebarLedClass}`}
      style={{
        position: mode === 'small' ? 'absolute' : 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: mode === 'small' ? 10001 : 10000,
        transform: isAnimating ? undefined : (mode === 'small' 
          ? 'translate(-50%, -50%) scale(0.25)' 
          : 'translate(-50%, -50%) scale(1)'),
        cursor: mode === 'small' ? 'pointer' : (isDragging ? 'grabbing' : 'grab'),
        userSelect: 'none',
        pointerEvents: 'auto'
      }}
      onMouseDown={mode === 'small' ? undefined : onMouseDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      title={mode === 'small'
        ? `Status: ${status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}\nDouble-click to restore`
        : `WebSocket: ${status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}\nClick to ${status === 'connected' ? 'poke' : 'reconnect'}, Double-click to minimize, Right-click for menu`
      }
    />
  );
};

