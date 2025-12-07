import React, { useEffect, useRef, useState } from "react";
import { LogsIcon } from "./Icons";
import { useAIControllableContext } from "../ai-controllable/AIControllableContext";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "debug" | "warn" | "error" | "trace";
  message: string;
  context?: Record<string, unknown>;
}

export const LogsPanel: React.FC<{ isOpen: boolean; onClose: () => void; onOpen: () => void }> = ({
  isOpen,
  onClose,
  onOpen
}) => {
  const { register, unregister, selectedElementId, setActivatedElementId } = useAIControllableContext();
  const openButtonRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedElementId === 'button-logs-open';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<"info" | "debug" | "warn" | "error">>(
    new Set(["info", "debug", "warn", "error"])
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Memoize callbacks for AI-controllable registration
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const isOpenRef = useRef(isOpen);
  
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    isOpenRef.current = isOpen;
  }, [onOpen, onClose, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Connect to WebSocket for real-time logs
    const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // We'll receive logs via a special log event type
        // For now, we'll fetch logs via HTTP
      } catch (err) {
        console.error("Invalid WS message in LogsPanel", err);
      }
    };

    // Fetch initial logs
    fetchLogs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current && isOpen) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  async function fetchLogs() {
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  }

  async function clearLogs() {
    try {
      const response = await fetch("/api/logs", {
        method: "DELETE"
      });
      if (response.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error("Failed to clear logs", err);
    }
  }

  const filteredLogs = logs.filter(
    (log) => selectedFilters.has(log.level as "info" | "debug" | "warn" | "error")
  );

  const toggleFilter = (level: "info" | "debug" | "warn" | "error") => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "var(--error)";
      case "warn":
        return "var(--warning)";
      case "info":
        return "var(--info)";
      case "debug":
        return "var(--muted)";
      default:
        return "var(--text-soft)";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3
    });
  };

  // Close logs when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const logsPanel = target.closest('.logs-panel');
      if (!logsPanel) {
        onClose();
      }
    };

    // Delay adding the listener to avoid immediate trigger from the open click
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Register the button that opens the logs panel as AI-controllable
  useEffect(() => {
    const element = {
      id: 'button-logs-open',
      type: 'button' as const,
      label: 'Show Logs',
      description: 'Open Logs panel from right side',
      select: () => {
        // Remove selection from all other elements first
        document.querySelectorAll('.ai-selected, .ai-selected-icon').forEach(el => {
          el.classList.remove('ai-selected', 'ai-selected-icon');
        });
        
        // Apply CSS classes to own elements
        const outlineEl = openButtonRef.current;
        const iconEl = outlineEl?.querySelector('svg');
        
        if (outlineEl) {
          outlineEl.classList.add('ai-selected');
        }
        if (iconEl) {
          iconEl.classList.add('ai-selected-icon');
        }
      },
      interact: async () => {
        // Set activated state for visual feedback
        const outlineEl = openButtonRef.current;
        const iconEl = outlineEl?.querySelector('svg');
        
        if (outlineEl) {
          outlineEl.classList.add('ai-activated');
        }
        if (iconEl) {
          iconEl.classList.add('ai-activated-icon');
        }
        
        // Remove activated state after animation
        setTimeout(() => {
          if (outlineEl) {
            outlineEl.classList.remove('ai-activated');
          }
          if (iconEl) {
            iconEl.classList.remove('ai-activated-icon');
          }
        }, 300);
        
        if (!isOpenRef.current) {
          onOpenRef.current();
        } else {
          onCloseRef.current();
        }
      },
      getBounds: () => openButtonRef.current?.getBoundingClientRect() || new DOMRect()
    };
    register(element);
    return () => {
      unregister('button-logs-open');
      // Cleanup: Remove CSS classes when unregistering
      const outlineEl = openButtonRef.current;
      const iconEl = outlineEl?.querySelector('svg');
      if (outlineEl) {
        outlineEl.classList.remove('ai-selected', 'ai-activated');
      }
      if (iconEl) {
        iconEl.classList.remove('ai-selected-icon', 'ai-activated-icon');
      }
    };
  }, [register, unregister]);

  return (
    <>
      <div className={`logs-panel ${isOpen ? "logs-panel-open" : ""}`}>
        {/* Morphing Button/Header with integrated filters */}
        <div 
          ref={openButtonRef}
          className={`logs-panel-morph ${isOpen ? 'logs-panel-morph-expanded' : ''} ${isSelected ? 'ai-selected' : ''}`}
          data-ai-controllable-id="button-logs-open"
          onClick={(e) => {
            // Nur ausführen, wenn nicht auf Filter-Buttons geklickt wurde
            const target = e.target as HTMLElement;
            if (target.closest('.logs-panel-morph-filters')) {
              return; // Filter-Buttons haben eigenen Handler
            }
            e.stopPropagation();
            isOpen ? onClose() : onOpen();
          }}
          title={isOpen ? "Click to close" : "Show Logs"}
        >
          {/* Icon, Title and Count as separate elements */}
          <LogsIcon className={isSelected ? 'ai-selected-icon' : ''} data-ai-icon="true" />
          <span className="logs-panel-morph-title">Logs</span>
          <span className="logs-panel-morph-count">{filteredLogs.length}</span>

          {/* Bottom row: Filters (only visible when expanded) */}
          {isOpen && (
            <div className="logs-panel-morph-filters">
              <div className="logs-panel-filters">
                <button
                  className={`logs-filter-btn logs-filter-debug ${selectedFilters.has("debug") ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleFilter("debug"); }}
                >
                  Debug
                </button>
                <button
                  className={`logs-filter-btn logs-filter-info ${selectedFilters.has("info") ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleFilter("info"); }}
                >
                  Info
                </button>
                <button
                  className={`logs-filter-btn logs-filter-warn ${selectedFilters.has("warn") ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleFilter("warn"); }}
                >
                  Warn
                </button>
                <button
                  className={`logs-filter-btn logs-filter-error ${selectedFilters.has("error") ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleFilter("error"); }}
                >
                  Error
                </button>
              </div>
              <div className="logs-panel-header-right">
                <button
                  className="logs-clear-btn"
                  onClick={(e) => { e.stopPropagation(); clearLogs(); }}
                  title="Clear logs"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="logs-panel-body" ref={listRef}>
          {filteredLogs.length === 0 ? (
            <div className="logs-empty">No logs available</div>
          ) : (
            <div className="logs-list">
              {filteredLogs.map((log) => (
                <div key={log.id} className={`logs-entry logs-entry-${log.level}`}>
                  <div className="logs-entry-header">
                    <span
                      className="logs-entry-level"
                      style={{ color: getLevelColor(log.level) }}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="logs-entry-time">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  <div className="logs-entry-message">{log.message}</div>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <details className="logs-entry-context">
                      <summary>Context</summary>
                      <pre>{JSON.stringify(log.context, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

