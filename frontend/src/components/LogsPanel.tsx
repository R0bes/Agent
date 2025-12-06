import React, { useEffect, useRef, useState } from "react";
import { LogsIcon } from "./Icons";

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<"info" | "debug" | "warn" | "error">>(
    new Set(["info", "debug", "warn", "error"])
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  return (
    <>
      <div className={`logs-panel ${isOpen ? "logs-panel-open" : ""}`}>
        {/* Morphing Button/Header with integrated filters */}
        <div 
          className={`logs-panel-morph ${isOpen ? 'logs-panel-morph-expanded' : ''}`}
        >
          {/* Top row: Title and icon */}
          <button
            className="logs-panel-morph-header"
            onClick={(e) => {
              e.stopPropagation();
              isOpen ? onClose() : onOpen();
            }}
            title={isOpen ? "Click to close" : "Show Logs"}
          >
            <div className="logs-panel-morph-content">
              <LogsIcon />
              <span className="logs-panel-morph-title">Logs</span>
              <span className="logs-panel-morph-count">{filteredLogs.length}</span>
            </div>
          </button>

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

