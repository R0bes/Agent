import { useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { subscribe } from '../../eventBus';
import { avatarCapabilities } from './AvatarCapabilities';
import type { AvatarContext, AvatarCommand, AvatarState, AvatarPresentationMode, AvatarPosition } from './types';

interface AvatarControllerProps {
  status: 'disconnected' | 'connecting' | 'connected';
  mode: AvatarPresentationMode;
  position: AvatarPosition;
  onModeChange: (mode: AvatarPresentationMode) => void;
  onPositionChange: (position: AvatarPosition) => void;
  onCapabilityExecute?: (capabilityId: string) => void;
}

export const useAvatarController = ({
  status,
  mode,
  position,
  onModeChange,
  onPositionChange,
  onCapabilityExecute
}: AvatarControllerProps) => {
  const { sendToBackend, socket } = useWebSocket();
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aKeyPressedRef = useRef(false);

  // Send avatar state to backend (debounced)
  const sendAvatarState = useCallback(() => {
    if (stateUpdateTimeoutRef.current) {
      clearTimeout(stateUpdateTimeoutRef.current);
    }

    stateUpdateTimeoutRef.current = setTimeout(() => {
      const state: AvatarState = {
        status,
        position,
        mode,
        availableCapabilities: avatarCapabilities.getAll().map(cap => cap.id)
      };

      sendToBackend({
        type: 'avatar_state',
        payload: state
      });
    }, 300); // Debounce: 300ms
  }, [status, position, mode, sendToBackend]);

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
              onPositionChange(command.target);
            }
            break;

          case 'capability':
          case 'expression':
          case 'action':
            if (command.capabilityId) {
              const context: AvatarContext = {
                status,
                position,
                mode,
                sendToBackend
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
  }, [status, position, mode, sendToBackend, onPositionChange, onCapabilityExecute]);

  // Hotkey handling for capabilities
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT';
      const hasMeta = e.ctrlKey || e.metaKey;

      if (isInputFocused && !hasMeta) return;
      if (!isInputFocused && hasMeta) return;

      const key = e.key.toLowerCase();

      // Handle a+1 combination for mode toggle
      if (key === 'a') {
        aKeyPressedRef.current = true;
        setTimeout(() => {
          aKeyPressedRef.current = false;
        }, 1000);
        return;
      }

      if (key === '1' && aKeyPressedRef.current) {
        e.preventDefault();
        aKeyPressedRef.current = false;
        onModeChange(mode === 'small' ? 'large' : 'small');
        return;
      }

      // Handle other a+X combinations for capabilities
      if (key.match(/^[0-9]$/) && aKeyPressedRef.current) {
        e.preventDefault();
        const hotkey = `a+${key}`;
        const capability = avatarCapabilities.getByHotkey(hotkey);
        
        if (capability) {
          const context: AvatarContext = {
            status,
            position,
            mode,
            sendToBackend
          };
          avatarCapabilities.execute(capability.id, context)
            .then(() => {
              if (onCapabilityExecute) {
                onCapabilityExecute(capability.id);
              }
            })
            .catch(err => {
              console.error('[AvatarController] Hotkey capability execution failed:', err);
            });
        }
        
        aKeyPressedRef.current = false;
        return;
      }

      // Reset a key flag if other keys are pressed
      if (aKeyPressedRef.current && key !== '1' && !key.match(/^[0-9]$/)) {
        aKeyPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, position, mode, sendToBackend, onModeChange, onCapabilityExecute]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }
    };
  }, []);
};

