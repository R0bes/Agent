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

  return (
    <>
      <div className={`logs-overlay ${isOpen ? "logs-overlay-open" : ""}`} onClick={onClose} />
      {/* Logs Hover Button - positioned outside panel so it's always visible */}
      <button
        className={`logs-hover-button ${isOpen ? "logs-button-panel-open" : ""}`}
        onClick={() => isOpen ? onClose() : onOpen()}
        title={isOpen ? "Close Logs" : "Show Logs"}
      >
        <LogsIcon />
      </button>
      <div className={`logs-panel ${isOpen ? "logs-panel-open" : ""}`}>
        <div className="logs-panel-header">
          <div className="logs-panel-filters">
            <button
              className={`logs-filter-btn logs-filter-debug ${selectedFilters.has("debug") ? "active" : ""}`}
              onClick={() => toggleFilter("debug")}
            >
              Debug
            </button>
            <button
              className={`logs-filter-btn logs-filter-info ${selectedFilters.has("info") ? "active" : ""}`}
              onClick={() => toggleFilter("info")}
            >
              Info
            </button>
            <button
              className={`logs-filter-btn logs-filter-warn ${selectedFilters.has("warn") ? "active" : ""}`}
              onClick={() => toggleFilter("warn")}
            >
              Warn
            </button>
            <button
              className={`logs-filter-btn logs-filter-error ${selectedFilters.has("error") ? "active" : ""}`}
              onClick={() => toggleFilter("error")}
            >
              Error
            </button>
          </div>
          <div className="logs-panel-header-right">
            <div className="logs-panel-count">{filteredLogs.length}</div>
            <button
              className="logs-clear-btn"
              onClick={clearLogs}
              title="Clear logs"
            >
              Clear
            </button>
          </div>
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

