import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { Avatar, type AvatarStatus } from "./components/avatar/Avatar";
import { AVATAR_MIN_SIZE, AVATAR_MAX_SIZE } from "./components/avatar/types";
import { AvatarContextMenu, type MenuItem } from "./components/AvatarContextMenu";
import { subscribe } from "./eventBus";
import { saveAvatarState, loadAvatarState, type AvatarState } from "./utils/avatarStorage";
import { AIControllableProvider, useAIControllableContext } from "./ai-controllable/AIControllableContext";
import { AISelectionOverlay } from "./ai-controllable/AISelectionOverlay";
import { avatarCapabilities } from "./components/avatar/AvatarCapabilities";
import type { AvatarContext } from "./components/avatar/types";
import { ServiceStatusBar } from "./components/ServiceStatusBar";

type ActivePanel = "preferences" | "conversation" | null;

// Inner component that can access AIControllableContext
const AppContent: React.FC = () => {
  const { getAllElements, selectedElementId, setSelectedElementId } = useAIControllableContext();
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
    // Default: Etwas weiter weg von der Ecke (Zentrum)
    return saved ? saved.position : { x: 80, y: 80 };
  });
  const [avatarSize, setAvatarSize] = useState<number>(() => {
    const saved = loadAvatarState();
    // Default: 1.0 (100%)
    return saved?.size ? Math.max(AVATAR_MIN_SIZE, Math.min(AVATAR_MAX_SIZE, saved.size)) : 1.0;
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Save avatar state to localStorage
  useEffect(() => {
    if (avatarPosition) {
      saveAvatarState({
        position: avatarPosition,
        size: avatarSize
      });
    }
  }, [avatarSize, avatarPosition]);

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

  // Handle avatar context menu (right click)
  const handleAvatarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Context menu actions - dynamically build from capabilities
  const contextMenuItems = React.useMemo(() => {
    const items: MenuItem[] = []; // Explicitly type as MenuItem[]

    // Basic actions
    items.push({
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
    });

    // Separator (visual)
    items.push({
      label: "---",
      action: () => {},
      disabled: true
    });

    // Avatar Capabilities
    const mimikriCapability = avatarCapabilities.get('mimikri');
    if (mimikriCapability) {
      items.push({
        label: mimikriCapability.hotkey 
          ? `${mimikriCapability.name} (${mimikriCapability.hotkey})`
          : mimikriCapability.name,
        action: async () => {
          const context: AvatarContext = {
            status,
            position: avatarPosition || { x: 80, y: 80 },
            size: avatarSize,
            sendToBackend,
            setSize: setAvatarSize,
            moveAvatar: setAvatarPosition // Verwende setAvatarPosition direkt als moveAvatar
          };
          try {
            await mimikriCapability.execute(context);
          } catch (err) {
            console.error('[App] Failed to execute mimikri capability:', err);
          }
        }
      });
    }

    // Separator (visual)
    items.push({
      label: "---",
      action: () => {},
      disabled: true
    });

    // AI-Controllable Elements (Submenu)
    const aiElements = getAllElements();
    if (aiElements.length > 0) {
      items.push({
        label: "AI-Controllable Elements",
        action: () => {},
        disabled: true
      });
      aiElements.forEach(element => {
        const isSelected = selectedElementId === element.id;
        items.push({
          label: element.label || element.id,
          action: () => {
            // Toggle selection only, do not interact
            if (isSelected) {
              setSelectedElementId(null);
            } else {
              setSelectedElementId(element.id);
            }
          }
        });
      });
    }

    // Utility actions
    items.push({
      label: "---",
      action: () => {},
      disabled: true
    });
    items.push({
      label: "Reset Position",
      action: () => {
        setAvatarPosition({ x: 80, y: 80 });
      }
    });

    return items;
  }, [status, avatarPosition, avatarSize, reconnect, sendToBackend, setAvatarPosition, setAvatarSize, getAllElements, selectedElementId, setSelectedElementId]);

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
              sendResponse({ position: args.position });
            } else {
              sendResponse(null, "Missing targetSelector or position");
            }
            break;
          }

          case "show_emotion": {
            // Emotion handling removed (not used in new architecture)
            sendResponse({ note: "Emotions removed, use capabilities instead" });
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
                size: avatarSize,
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

          default:
            sendResponse(null, `Unknown action: ${action}`);
        }
      }
    });

    return unsubscribe;
  }, [logsOpen, memoryOpen, activePanel, schedulerOpen, toolboxOpen, workersOpen, sendToBackend, avatarPosition, avatarSize]);

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
      default:
        console.warn(`Unknown panel action for: ${panel}`);
    }
  };

  // Hotkey handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input field is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT";
      if (isInputFocused) return;

      const key = e.key.toLowerCase();

      switch (key) {
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
  }, [schedulerOpen, toolboxOpen, workersOpen, logsOpen, memoryOpen, activePanel]);

  return (
      <div className="app-shell">
        {/* Service Status Bar - Top left corner */}
        <ServiceStatusBar />
        
        {/* AI Selection Overlay */}
        <AISelectionOverlay />
        
        {/* Avatar component - always rendered (handles mode switching internally) */}
        <Avatar 
        status={status}
        position={avatarPosition}
        size={avatarSize}
        onPositionChange={setAvatarPosition}
        onSizeChange={setAvatarSize}
        onDragEnd={handleAvatarDragEnd}
        onContextMenu={handleAvatarContextMenu}
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
      
      <div className="sidebar-wrapper">
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
              aiControllable={false}
            />
            <IconButton
              icon={<ClockIcon />}
              title="Scheduler"
              active={schedulerOpen}
              variant="ghost"
              size="sm"
              onClick={() => setSchedulerOpen(!schedulerOpen)}
              aiControllable={false}
            />
            <IconButton
              icon={<ToolboxIcon />}
              title="Toolbox"
              active={toolboxOpen}
              variant="ghost"
              size="sm"
              onClick={() => setToolboxOpen(!toolboxOpen)}
              aiControllable={false}
            />
            <div className="sidebar-divider" />
            <IconButton
              icon={<ConversationIcon />}
              title="Conversation"
              active={activePanel === "conversation"}
              variant="ghost"
              size="sm"
              onClick={() => handlePanelToggle("conversation")}
              aiControllable={false}
            />
            <IconButton
              icon={<MemoryIcon />}
              title="Memory"
              active={memoryOpen}
              variant="ghost"
              size="sm"
              onClick={() => setMemoryOpen(!memoryOpen)}
              aiControllable={false}
            />
            <div className="sidebar-divider" />
            <IconButton
              icon={<LogsIcon />}
              title="Logs"
              active={logsOpen}
              variant="ghost"
              size="sm"
              onClick={() => setLogsOpen(!logsOpen)}
              aiControllable={false}
            />
            <IconButton
              icon={<PreferencesIcon />}
              title="Preferences"
              active={activePanel === "preferences"}
              variant="ghost"
              size="sm"
              onClick={() => handlePanelToggle("preferences")}
              aiControllable={false}
            />
          </nav>
        </div>
      </aside>
      </div>

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
  );
};

export const App: React.FC = () => {
  return (
    <AIControllableProvider>
      <AppContent />
    </AIControllableProvider>
  );
};
