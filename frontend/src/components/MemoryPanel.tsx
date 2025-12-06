import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";
import { MemoryIcon } from "./Icons";
import type { MemoryItem, MemoryKind, DBStatus } from "../types/memory";

const DEMO_USER_ID = "user-123";

export const MemoryPanel: React.FC<{ isOpen: boolean; onClose: () => void; onOpen: () => void }> = ({
  isOpen,
  onClose,
  onOpen
}) => {
  const panelExpanded = isOpen;
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [filterKind, setFilterKind] = useState<MemoryKind | "all">("all");
  const [showCompaktified, setShowCompaktified] = useState(true);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  // Load memories with filters
  const loadMemories = () => {
    const params = new URLSearchParams();
    params.append("userId", DEMO_USER_ID);
    if (filterKind !== "all") {
      params.append("kind", filterKind);
    }
    if (!showCompaktified) {
      params.append("isCompaktified", "false");
    }

    fetch(`/api/memory?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.memories)) {
          setMemories(data.memories);
        }
      })
      .catch((err) => console.error("Failed to load memories", err));
  };

  // Load DB status
  const loadStatus = () => {
    fetch("/api/memory/status")
      .then((res) => res.json())
      .then((data) => {
        setDbStatus(data);
      })
      .catch((err) => console.error("Failed to load status", err));
  };

  useEffect(() => {
    if (!isOpen) return;

    loadMemories();
    loadStatus();

    // Reload status every 30 seconds
    const statusInterval = setInterval(loadStatus, 30000);

    const unsubscribe = subscribe((event) => {
      if (event.type === "memory_updated" && event.payload?.userId === DEMO_USER_ID) {
        loadMemories();
      }
    });

    return () => {
      clearInterval(statusInterval);
      unsubscribe();
    };
  }, [isOpen, filterKind, showCompaktified]);

  const toggleExpand = (memoryId: string) => {
    setExpandedMemoryId(expandedMemoryId === memoryId ? null : memoryId);
  };

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const memoryPanel = target.closest('.memory-panel');
      if (!memoryPanel) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className={`memory-panel ${panelExpanded ? "memory-panel-open" : ""}`}>
      {/* Morphing Button/Header */}
      <button
        className={`memory-panel-morph ${panelExpanded ? 'memory-panel-morph-expanded' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          panelExpanded ? onClose() : onOpen();
        }}
        title={panelExpanded ? "Click to close" : "Show Memory"}
      >
        <div className="memory-panel-morph-header">
          <div className="memory-panel-morph-content">
            <MemoryIcon />
            <span className="memory-panel-morph-title">Memory</span>
            <span className="memory-panel-morph-count">{memories.length}</span>
          </div>

          {/* Filters and status in header (only visible when expanded) */}
          {panelExpanded && (
            <div className="memory-panel-morph-filters">
              {/* Tabs for Memory Types */}
              <div className="memory-tabs">
                <button
                  className={`memory-tab ${filterKind === "fact" ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterKind("fact");
                  }}
                >
                  Facts
                </button>
                <button
                  className={`memory-tab ${filterKind === "preference" ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterKind("preference");
                  }}
                >
                  Preferences
                </button>
                <button
                  className={`memory-tab ${filterKind === "summary" ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterKind("summary");
                  }}
                >
                  Summaries
                </button>
                <button
                  className={`memory-tab ${filterKind === "episode" ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterKind("episode");
                  }}
                >
                  Episodes
                </button>
              </div>

              {/* DB Status - ganz rechts */}
              {dbStatus && (
                <div className="memory-status">
                  <div className="memory-status-item">
                    <span className={`memory-status-indicator ${dbStatus.postgres.connected ? 'connected' : 'disconnected'}`}>
                      {dbStatus.postgres.connected ? "●" : "○"}
                    </span>
                    <div className="memory-status-details">
                      <span className="memory-status-label">PostgreSQL</span>
                    </div>
                  </div>
                  <div className="memory-status-item">
                    <span className={`memory-status-indicator ${dbStatus.qdrant.connected ? 'connected' : 'disconnected'}`}>
                      {dbStatus.qdrant.connected ? "●" : "○"}
                    </span>
                    <div className="memory-status-details">
                      <span className="memory-status-label">Qdrant</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Panel Body */}
      <div className="memory-panel-body">
        {/* Memory Content */}
        <div className="memory-panel-body-content">
        {memories.length === 0 ? (
          <div className="memory-empty">
            <div className="memory-empty-icon">🧠</div>
            <div className="memory-empty-text">
              {filterKind === "all" 
                ? "No memories yet. Send messages to create them."
                : `No ${filterKind} memories found.`}
            </div>
          </div>
        ) : (
          <div className="memory-list">
            {memories.map((m) => (
              <div key={m.id} className={`memory-item ${m.isCompaktified ? 'memory-item-compaktified' : ''}`}>
                <div className="memory-item-header">
                  <span className="memory-item-title">{m.title}</span>
                  <div className="memory-item-badges">
                    <span className={`memory-badge memory-badge-${m.kind}`}>{m.kind}</span>
                    {m.isCompaktified && (
                      <span className="memory-badge memory-badge-compaktified">kompakt</span>
                    )}
                  </div>
                </div>
                
                <div className="memory-item-content">{m.content}</div>
                
                {/* Tags */}
                {m.tags && m.tags.length > 0 && (
                  <div className="memory-item-tags">
                    {m.tags.map((tag, idx) => (
                      <span key={idx} className="memory-tag">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Metadata footer */}
                <div className="memory-item-footer">
                  <span className="memory-item-date">
                    {new Date(m.createdAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>

                  {/* Source References */}
                  {m.sourceReferences && m.sourceReferences.length > 0 && (
                    <button
                      className="memory-sources-toggle"
                      onClick={() => toggleExpand(m.id)}
                    >
                      {expandedMemoryId === m.id ? "▼" : "▶"} {m.sourceReferences.length} source{m.sourceReferences.length !== 1 ? 's' : ''}
                    </button>
                  )}

                  {/* Compaktified From */}
                  {m.compaktifiedFrom && m.compaktifiedFrom.length > 0 && (
                    <span className="memory-compaktified-info">
                      from {m.compaktifiedFrom.length} memories
                    </span>
                  )}
                </div>

                {/* Expanded Source References */}
                {expandedMemoryId === m.id && m.sourceReferences && (
                  <div className="memory-sources">
                    {m.sourceReferences.map((ref, idx) => (
                      <div key={idx} className="memory-source">
                        <div className="memory-source-header">
                          <span className={`memory-source-type memory-source-type-${ref.type}`}>
                            {ref.type}
                          </span>
                          <span className="memory-source-id">{ref.id.slice(0, 12)}...</span>
                          <span className="memory-source-time">
                            {new Date(ref.timestamp).toLocaleTimeString("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        {ref.excerpt && (
                          <div className="memory-source-excerpt">"{ref.excerpt}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

