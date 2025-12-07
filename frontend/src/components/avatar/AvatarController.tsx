import { useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { subscribe } from '../../eventBus';
import { avatarCapabilities } from './AvatarCapabilities';
import type { AvatarContext, AvatarCommand, AvatarState, AvatarPosition } from './types';
import { AVATAR_MIN_SIZE, AVATAR_MAX_SIZE } from './types';

interface AvatarControllerProps {
  status: 'disconnected' | 'connecting' | 'connected';
  size: number;  // 0.25 - 1.75 (direkt)
  position: AvatarPosition;  // Zentrum
  onSizeChange: (size: number) => void;
  onPositionChange: (position: AvatarPosition) => void;
  onCapabilityExecute?: (capabilityId: string) => void;
  moveAvatar?: (position: AvatarPosition) => void; // Für Capabilities
}

export const useAvatarController = ({
  status,
  size,
  position,
  onSizeChange,
  onPositionChange,
  onCapabilityExecute,
  moveAvatar
}: AvatarControllerProps) => {
  const { sendToBackend } = useWebSocket();
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send avatar state to backend (debounced)
  const sendAvatarState = useCallback(() => {
    if (stateUpdateTimeoutRef.current) {
      clearTimeout(stateUpdateTimeoutRef.current);
    }

    stateUpdateTimeoutRef.current = setTimeout(() => {
      const state: AvatarState = {
        status,
        position,
        size,
        availableCapabilities: avatarCapabilities.getAll().map(cap => cap.id)
      };

      sendToBackend({
        type: 'avatar_state',
        payload: state
      });
    }, 300); // Debounce: 300ms
  }, [status, position, size, sendToBackend]);

  // Send state updates when state changes
  useEffect(() => {
    sendAvatarState();
  }, [sendAvatarState]);

  // Handle avatar commands from backend (via eventBus)
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === 'avatar_command') {
        const command = event.payload as AvatarCommand;
        console.log('[AvatarController] Received command:', command);

        switch (command.command) {
          case 'move':
            if (command.target) {
              console.log('[AvatarController] Moving avatar to:', command.target);
              onPositionChange(command.target);
            }
            break;

          case 'set_size':
          case 'resize':
            if (command.size !== undefined) {
              const clampedSize = Math.max(
                AVATAR_MIN_SIZE, 
                Math.min(AVATAR_MAX_SIZE, command.size)
              );
              onSizeChange(clampedSize);
            }
            break;

          case 'capability':
          case 'expression':
          case 'action':
            if (command.capabilityId) {
              const context: AvatarContext = {
                status,
                position,
                size,
                sendToBackend,
                setSize: onSizeChange,
                moveAvatar: moveAvatar || onPositionChange
              };
              avatarCapabilities.execute(command.capabilityId, context)
                .then(() => {
                  if (onCapabilityExecute) {
                    onCapabilityExecute(command.capabilityId!);
                  }
                })
                .catch(err => {
                  console.error('[AvatarController] Capability execution failed:', err);
                });
            }
            break;
        }
      }
    });

    return unsubscribe;
  }, [status, position, size, sendToBackend, onPositionChange, onSizeChange, onCapabilityExecute]);

  // Hotkey handling for capabilities (später)
  // Size-Toggle Hotkeys entfernt - nur Mausrad für Skalierung

  // Cleanup
  useEffect(() => {
    return () => {
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }
    };
  }, []);
};
