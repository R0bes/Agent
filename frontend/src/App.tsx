import React, { useState, useRef, useEffect } from "react";
import { ChatView } from "./components/ChatView";
import { MemoryPanel } from "./components/MemoryPanel";
import { PreferencesCard } from "./components/PreferencesCard";
import { ConversationCard } from "./components/ConversationCard";
import { SchedulerPanel } from "./components/SchedulerPanel";
import { ToolboxPanel } from "./components/ToolboxPanel";
import { WorkersPanel } from "./components/WorkersPanel";
import { LogsPanel } from "./components/LogsPanel";
import { IconButton } from "./components/IconButton";
import { WorkersIcon, MemoryIcon, PreferencesIcon, ToolboxIcon, LogsIcon, ConversationIcon, ClockIcon } from "./components/Icons";
import { useWebSocket } from "./contexts/WebSocketContext";
import { Avatar, type AvatarEmotion, type AvatarPresentationMode } from "./components/avatar/Avatar";
import { AvatarContextMenu } from "./components/AvatarContextMenu";
import { subscribe } from "./eventBus";
import { saveAvatarState, loadAvatarState, type AvatarState } from "./utils/avatarStorage";
import { AIControllableProvider } from "./ai-controllable/AIControllableContext";
import { AISelectionOverlay } from "./ai-controllable/AISelectionOverlay";

type ActivePanel = "preferences" | "conversation" | null;

export const App: React.FC = () => {
  const [logsOpen, setLogsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [workersOpen, setWorkersOpen] = useState(false);
  const { status, sendToBackend, reconnect } = useWebSocket();
  
  // Load avatar state from localStorage on mount
  const [avatarPosition, setAvatarPosition] = useState<{ x: number; y: number } | undefined>(() => {
    const saved = loadAvatarState();
    return saved ? saved.position : { x: 24, y: window.innerHeight / 2 }; // Sidebar center (48px / 2 = 24px)
  });
  const [avatarEmotion, setAvatarEmotion] = useState<AvatarEmotion>(null);
  const [avatarMode, setAvatarMode] = useState<AvatarPresentationMode>(() => {
    const saved = loadAvatarState();
    return saved?.minimized ? 'small' : 'large';
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Save avatar state to localStorage only for mode (not position)
  useEffect(() => {
    if (avatarPosition) {
      saveAvatarState({
        position: avatarPosition,
        minimized: avatarMode === 'small'
      });
    }
  }, [avatarMode, avatarPosition]); // Save when mode changes

  // Convert absolute position to relative (0-1)
  const getRelativePosition = (pos: { x: number; y: number }): { x: number; y: number } => {
    return {
      x: pos.x / window.innerWidth,
      y: pos.y / window.innerHeight
    };
  };

  // Handle avatar drag end (no longer saving position)
  const handleAvatarDragEnd = (position: { x: number; y: number }) => {
    // Just update visual position, don't save
    setAvatarPosition(position);
  };

  // Handle avatar click (single click)
  const handleAvatarClick = () => {
    // Single click: only handle if not in small mode
    if (avatarMode === 'small') {
      return; // Do nothing on single click when in small mode
    }
    
    if (status === "disconnected") {
      // Trigger reconnection
      if (reconnect) {
        reconnect();
      }
    } else if (status === "connected") {
      // Send poke event to AI
      sendToBackend({
        type: "avatar_poke",
        payload: {
          timestamp: new Date().toISOString(),
          position: avatarPosition ? getRelativePosition(avatarPosition) : null
        }
      });
    }
  };

  // Handle avatar double click (toggle mode)
  const handleAvatarDoubleClick = () => {
    setAvatarMode((prev) => prev === 'small' ? 'large' : 'small');
    // State will be saved automatically via useEffect
  };

  // Handle avatar context menu (right click)
  const handleAvatarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Context menu actions
  const contextMenuItems = [
    {
      label: avatarMode === 'small' ? "Restore Avatar" : "Minimize to LED",
      action: () => setAvatarMode(avatarMode === 'small' ? 'large' : 'small')
    },
    {
      label: status === "connected" ? "Poke AI" : "Reconnect",
      action: () => {
        if (status === "disconnected" && reconnect) {
          reconnect();
        } else if (status === "connected") {
          sendToBackend({
            type: "avatar_poke",
            payload: {
              timestamp: new Date().toISOString(),
              position: avatarPosition ? getRelativePosition(avatarPosition) : null
            }
          });
        }
      }
    },
    {
      label: "Show Emotion: Happy",
      action: () => {
        setAvatarEmotion("happy");
        setTimeout(() => setAvatarEmotion(null), 2000);
      }
    },
    {
      label: "Show Emotion: Thinking",
      action: () => {
        setAvatarEmotion("thinking");
        setTimeout(() => setAvatarEmotion(null), 2000);
      }
    },
    {
      label: "Reset Position",
      action: () => {
        setAvatarPosition({ x: 24, y: window.innerHeight / 2 }); // Sidebar center
      }
    }
  ];

  const handlePanelToggle = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // GUI Action Handler
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === "gui_action") {
        const { action, requestId, ...args } = event.payload;

        const sendResponse = (data: any, error?: string) => {
          if (requestId) {
            sendToBackend({
              type: "gui_response",
              payload: {
                requestId,
                ok: !error,
                data: error ? undefined : data,
                error
              }
            });
          }
        };

        switch (action) {
          case "move_avatar": {
            if (args.targetSelector) {
              // Move to element
              const element = document.querySelector(args.targetSelector);
              if (element) {
                const rect = element.getBoundingClientRect();
                const newPosition = {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2
                };
                setAvatarPosition(newPosition);
                if (args.emotion) {
                  setAvatarEmotion(args.emotion);
                }
                
                // After animation, open panel if specified
                if (args.panel) {
                  setTimeout(() => {
                    handlePanelAction(args.panel, true);
                  }, 600);
                }
                sendResponse({ position: newPosition });
              } else {
                sendResponse(null, `Element not found: ${args.targetSelector}`);
              }
            } else if (args.position) {
              // Move to absolute position
              setAvatarPosition(args.position);
              if (args.emotion) {
                setAvatarEmotion(args.emotion);
              }
              sendResponse({ position: args.position });
            } else {
              sendResponse(null, "Missing targetSelector or position");
            }
            break;
          }

          case "show_emotion": {
            if (args.emotion) {
              setAvatarEmotion(args.emotion);
              // Reset emotion after animation duration
              setTimeout(() => {
                setAvatarEmotion(null);
              }, args.duration || 2000);
              sendResponse({ emotion: args.emotion });
            } else {
              sendResponse(null, "Missing emotion parameter");
            }
            break;
          }

          case "open_panel":
          case "close_panel": {
            const shouldOpen = action === "open_panel";
            if (args.panel) {
              handlePanelAction(args.panel, shouldOpen);
              sendResponse({ panel: args.panel, open: shouldOpen });
            } else {
              sendResponse(null, "Missing panel parameter");
            }
            break;
          }

          case "highlight_element": {
            if (args.elementId || args.selector) {
              const selector = args.elementId ? `#${args.elementId}` : args.selector;
              const element = document.querySelector(selector);
              if (element) {
                element.classList.add("gui-highlighted");
                setTimeout(() => {
                  element.classList.remove("gui-highlighted");
                }, args.duration || 2000);
                sendResponse({ element: selector });
              } else {
                sendResponse(null, `Element not found: ${selector}`);
              }
            } else {
              sendResponse(null, "Missing elementId or selector");
            }
            break;
          }

          case "show_notification": {
            // Create notification element
            const notification = document.createElement("div");
            notification.className = `gui-notification gui-notification-${args.level || "info"}`;
            notification.textContent = args.message || "Notification";
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.classList.add("gui-notification-show");
            }, 10);
            
            setTimeout(() => {
              notification.classList.remove("gui-notification-show");
              setTimeout(() => {
                document.body.removeChild(notification);
              }, 300);
            }, args.duration || 3000);
            
            sendResponse({ message: args.message });
            break;
          }

          case "take_screenshot": {
            // This will be handled by screenshot utility
            import("./utils/screenshot").then(({ takeScreenshot }) => {
              takeScreenshot(args.selector, args.fullPage || false)
                .then((base64) => {
                  sendResponse({ screenshot: base64 });
                })
                .catch((error) => {
                  sendResponse(null, error.message);
                });
            });
            break;
          }

          case "get_element_info": {
            import("./utils/elementInfo").then(({ getElementInfo }) => {
              try {
                const info = getElementInfo(args.selector || args.elementId);
                sendResponse(info);
              } catch (error: any) {
                sendResponse(null, error.message);
              }
            });
            break;
          }

          case "get_panel_status": {
            const panelStatus = {
              logs: logsOpen,
              memory: memoryOpen,
              workers: workersOpen,
              toolbox: toolboxOpen,
              scheduler: schedulerOpen,
              settings: activePanel === "preferences",
              conversation: activePanel === "conversation"
            };
            sendResponse(panelStatus);
            break;
          }

          case "get_avatar_position": {
            if (avatarPosition) {
              const relative = getRelativePosition(avatarPosition);
              sendResponse({
                absolute: avatarPosition,
                relative: relative,
                mode: avatarMode,
                viewport: {
                  width: window.innerWidth,
                  height: window.innerHeight
                }
              });
            } else {
              sendResponse(null, "Avatar position not available");
            }
            break;
          }

          case "minimize_to_status_led": {
            setAvatarMode('small');
            sendResponse({ mode: 'small' });
            break;
          }

          case "restore_from_status_led": {
            setAvatarMode('large');
            sendResponse({ mode: 'large' });
            break;
          }

          default:
            sendResponse(null, `Unknown action: ${action}`);
        }
      }
    });

    return unsubscribe;
  }, [logsOpen, memoryOpen, activePanel, schedulerOpen, toolboxOpen, workersOpen, sendToBackend]);

  const handlePanelAction = (panel: string, open: boolean) => {
    switch (panel) {
      case "logs":
        setLogsOpen(open);
        break;
      case "memory":
        setMemoryOpen(open);
        break;
      case "workers":
        setWorkersOpen(open);
        break;
      case "toolbox":
        setToolboxOpen(open);
        break;
      case "scheduler":
        setSchedulerOpen(open);
        break;
      case "settings":
      case "preferences":
        setActivePanel(open ? "preferences" : null);
        break;
      case "conversation":
        setActivePanel(open ? "conversation" : null);
        break;
    }
  };

  // Function to find button position by title and trigger avatar animation
  const triggerAvatarButtonPress = (buttonTitle: string, action: () => void) => {
    // Ensure avatar is not in small mode
    if (avatarMode === 'small') {
      setAvatarMode('large');
      // Wait for avatar to restore before moving
      setTimeout(() => {
        triggerAvatarButtonPress(buttonTitle, action);
      }, 400);
      return;
    }
    
    // Find button by title attribute
    const buttons = document.querySelectorAll('.icon-btn');
    let targetButton: HTMLElement | null = null;
    
    buttons.forEach(btn => {
      if (btn.getAttribute('title') === buttonTitle) {
        targetButton = btn as HTMLElement;
      }
    });
    
    if (!targetButton) {
      console.log('[App] Button not found for title:', buttonTitle);
      // Fallback: execute action directly if button not found
      action();
      return;
    }
    
    // Get sidebar to check if it's expanded
    const sidebar = document.querySelector('.sidebar');
    const sidebarRect = sidebar?.getBoundingClientRect();
    const sidebarComputedStyle = sidebar ? window.getComputedStyle(sidebar) : null;
    const sidebarTransform = sidebarComputedStyle?.transform;
    const isSidebarExpanded = sidebarTransform === 'none' || sidebarTransform?.includes('translateX(0)');
    
    // Get button position (getBoundingClientRect gives absolute viewport position)
    const rect = targetButton.getBoundingClientRect();
    
    // Calculate button center position
    // If sidebar is collapsed, buttons are at left: -38px (hidden), so we need to calculate where they would be when expanded
    let buttonCenter: { x: number; y: number };
    
    if (isSidebarExpanded && sidebarRect) {
      // Sidebar is expanded, use actual button position
      buttonCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    } else if (sidebarRect) {
      // Sidebar is collapsed, calculate where button would be when expanded
      // Sidebar center is at left: 24px (48px / 2) when expanded
      buttonCenter = {
        x: 24, // Center of sidebar (48px / 2)
        y: rect.top + rect.height / 2 // Use actual Y position from DOM
      };
    } else {
      // Fallback
      buttonCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    
    console.log('[App] Moving avatar to button:', buttonTitle, {
      buttonRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      sidebarExpanded: isSidebarExpanded,
      buttonCenter,
      currentAvatarPos: avatarPosition
    });
    
    // Move avatar to button position
    setAvatarPosition(buttonCenter);
    setAvatarEmotion("attentive");
    
    // After avatar reaches button, show press animation and execute action
    setTimeout(() => {
      setAvatarEmotion("excited"); // Press animation
      setTimeout(() => {
        action(); // Execute the action
        // Return avatar to original position after a short delay
        setTimeout(() => {
          setAvatarEmotion(null);
          // Optionally return to previous position or keep at button
        }, 300);
      }, 200); // Press duration
    }, 600); // Time for avatar to reach button
  };

  // Track if arrow keys are being used (to prevent useEffect from interfering)
  const [isArrowKeyControl, setIsArrowKeyControl] = useState(false);
  const arrowKeyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Arrow key control for avatar
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      // Only handle arrow keys if avatar is not in small mode
      if (avatarMode === 'small') return;
      
      // Check if input field is focused - don't interfere with text input
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT";
      if (isInputFocused) return;
      
      const stepSize = 10; // Pixels to move per keypress
      const currentPos = avatarPosition || { x: 24, y: window.innerHeight / 2 };
      
      let newPosition = { ...currentPos };
      let moved = false;
      
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newPosition.y = Math.max(20, currentPos.y - stepSize);
          moved = true;
          break;
        case "ArrowDown":
          e.preventDefault();
          newPosition.y = Math.min(window.innerHeight - 20, currentPos.y + stepSize);
          moved = true;
          break;
        case "ArrowLeft":
          e.preventDefault();
          newPosition.x = Math.max(20, currentPos.x - stepSize);
          moved = true;
          break;
        case "ArrowRight":
          e.preventDefault();
          newPosition.x = Math.min(window.innerWidth - 20, currentPos.x + stepSize);
          moved = true;
          break;
      }
      
      if (moved) {
        // Mark that arrow key control is active
        setIsArrowKeyControl(true);
        
        // Clear existing timeout
        if (arrowKeyTimeoutRef.current) {
          clearTimeout(arrowKeyTimeoutRef.current);
        }
        
        // Update position
        setAvatarPosition(newPosition);
        
        // Reset flag after a delay (when user stops pressing keys)
        arrowKeyTimeoutRef.current = setTimeout(() => {
          setIsArrowKeyControl(false);
        }, 200);
      }
    };

    window.addEventListener("keydown", handleArrowKeys);
    return () => {
      window.removeEventListener("keydown", handleArrowKeys);
      if (arrowKeyTimeoutRef.current) {
        clearTimeout(arrowKeyTimeoutRef.current);
      }
    };
  }, [avatarPosition, avatarMode]);

  // Track if 'a' key is pressed for a+1 combination
  const aKeyPressedRef = useRef(false);

  // Hotkey handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input field is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT";
      const hasMeta = e.ctrlKey || e.metaKey;

      // If input is focused, require meta key; otherwise, don't allow meta key
      if (isInputFocused && !hasMeta) return;
      if (!isInputFocused && hasMeta) return;

      const key = e.key.toLowerCase();

      // Handle a+1 combination for avatar minimize/restore
      if (key === "a") {
        aKeyPressedRef.current = true;
        // Clear flag after a short delay if no '1' is pressed
        setTimeout(() => {
          aKeyPressedRef.current = false;
        }, 1000);
        return; // Don't prevent default, just track the key
      }

      if (key === "1" && aKeyPressedRef.current) {
        e.preventDefault();
        aKeyPressedRef.current = false;
        setAvatarMode(avatarMode === 'small' ? 'large' : 'small');
        return;
      }

      // Reset a key flag if other keys are pressed
      if (aKeyPressedRef.current && key !== "1") {
        aKeyPressedRef.current = false;
      }

      // Prevent default only for our hotkeys
      switch (key) {
        case "s":
          e.preventDefault();
          triggerAvatarButtonPress("Scheduler", () => setSchedulerOpen(!schedulerOpen));
          break;
        case "t":
          e.preventDefault();
          triggerAvatarButtonPress("Toolbox", () => setToolboxOpen(!toolboxOpen));
          break;
        case "w":
          e.preventDefault();
          triggerAvatarButtonPress("Workers", () => setWorkersOpen(!workersOpen));
          break;
        case "l":
          e.preventDefault();
          triggerAvatarButtonPress("Logs", () => setLogsOpen(!logsOpen));
          break;
        case "m":
          e.preventDefault();
          triggerAvatarButtonPress("Memory", () => setMemoryOpen(!memoryOpen));
          break;
        case "c":
          e.preventDefault();
          triggerAvatarButtonPress("Conversation", () => handlePanelToggle("conversation"));
          break;
        case "p":
          e.preventDefault();
          triggerAvatarButtonPress("Preferences", () => handlePanelToggle("preferences"));
          break;
        case ".":
        case ",":
          e.preventDefault();
          // Close all panels
          if (schedulerOpen) setSchedulerOpen(false);
          if (toolboxOpen) setToolboxOpen(false);
          if (workersOpen) setWorkersOpen(false);
          if (memoryOpen) setMemoryOpen(false);
          if (logsOpen) setLogsOpen(false);
          if (activePanel) setActivePanel(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [schedulerOpen, toolboxOpen, workersOpen, logsOpen, memoryOpen, activePanel, avatarMode]);

  return (
    <AIControllableProvider>
      <div className="app-shell">
        {/* AI Selection Overlay */}
        <AISelectionOverlay />
        
        {/* Avatar component - always rendered (handles mode switching internally) */}
        <Avatar 
        status={status}
        position={avatarPosition}
        emotion={avatarEmotion}
        mode={avatarMode}
        onDragEnd={handleAvatarDragEnd}
        onClick={handleAvatarClick}
        onDoubleClick={handleAvatarDoubleClick}
        onContextMenu={handleAvatarContextMenu}
        onModeChange={setAvatarMode}
        isArrowKeyControl={isArrowKeyControl}
      />

      {/* Context Menu */}
      {contextMenu && (
        <AvatarContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
      
      <aside className="sidebar">
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <IconButton
              icon={<WorkersIcon />}
              title="Workers"
              active={workersOpen}
              variant="ghost"
              size="sm"
              onClick={() => setWorkersOpen(!workersOpen)}
              aiControllable={true}
              aiId="sidebar-button-workers"
            />
            <IconButton
              icon={<ClockIcon />}
              title="Scheduler"
              active={schedulerOpen}
              variant="ghost"
              size="sm"
              onClick={() => setSchedulerOpen(!schedulerOpen)}
              aiControllable={true}
              aiId="sidebar-button-scheduler"
            />
            <IconButton
              icon={<ToolboxIcon />}
              title="Toolbox"
              active={toolboxOpen}
              variant="ghost"
              size="sm"
              onClick={() => setToolboxOpen(!toolboxOpen)}
              aiControllable={true}
              aiId="sidebar-button-toolbox"
            />
            <div className="sidebar-divider" />
            <IconButton
              icon={<ConversationIcon />}
              title="Conversation"
              active={activePanel === "conversation"}
              variant="ghost"
              size="sm"
              onClick={() => handlePanelToggle("conversation")}
              aiControllable={true}
              aiId="sidebar-button-conversation"
            />
            <IconButton
              icon={<MemoryIcon />}
              title="Memory"
              active={memoryOpen}
              variant="ghost"
              size="sm"
              onClick={() => setMemoryOpen(!memoryOpen)}
              aiControllable={true}
              aiId="sidebar-button-memory"
            />
            <div className="sidebar-divider" />
            <IconButton
              icon={<LogsIcon />}
              title="Logs"
              active={logsOpen}
              variant="ghost"
              size="sm"
              onClick={() => setLogsOpen(!logsOpen)}
              aiControllable={true}
              aiId="sidebar-button-logs"
            />
            <IconButton
              icon={<PreferencesIcon />}
              title="Preferences"
              active={activePanel === "preferences"}
              variant="ghost"
              size="sm"
              onClick={() => handlePanelToggle("preferences")}
              aiControllable={true}
              aiId="sidebar-button-preferences"
            />
          </nav>
        </div>
      </aside>

      <main className="main">
        <section className="chat-section">
          <ChatView />
        </section>
        
        {/* Scheduler Panel - Slides up from bottom left */}
        <SchedulerPanel isOpen={schedulerOpen} onToggle={() => setSchedulerOpen(!schedulerOpen)} />
        
        {/* Toolbox Panel - Slides up from bottom right */}
        <ToolboxPanel isOpen={toolboxOpen} onToggle={() => setToolboxOpen(!toolboxOpen)} />
      </main>

      {/* Rotating Panel Cards */}
      <div className="panel-cards-container">
        <ConversationCard isOpen={activePanel === "conversation"} onClose={() => setActivePanel(null)} />
        <PreferencesCard isOpen={activePanel === "preferences"} onClose={() => setActivePanel(null)} />
      </div>

      {/* Workers Panel - Morphing from right edge */}
      <WorkersPanel isOpen={workersOpen} onToggle={() => setWorkersOpen(!workersOpen)} />

      {/* Memory Panel (slide-in from right, larger than logs) */}
      <MemoryPanel isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} onOpen={() => setMemoryOpen(true)} />

      {/* Logs Panel with integrated button */}
      <LogsPanel isOpen={logsOpen} onClose={() => setLogsOpen(false)} onOpen={() => setLogsOpen(true)} />
      </div>
    </AIControllableProvider>
  );
};
