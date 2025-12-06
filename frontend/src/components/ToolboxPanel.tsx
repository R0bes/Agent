import React, { useState, useEffect } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { ToolboxIcon } from "./Icons";

interface Tool {
  name: string;
  shortDescription: string;
  description: string;
  enabled: boolean;
  enabledForPersona?: boolean;
  enabledForWorker?: boolean;
  status?: "healthy" | "error" | "warning";
  lastError?: string;
}

// System tools that are both tools and services
const SYSTEM_SERVICE_TOOLS = ["llm_chat", "scheduler", "worker_manager", "tool_registry"];

// Tool category detection
const getToolCategory = (toolName: string): string => {
  if (SYSTEM_SERVICE_TOOLS.includes(toolName)) return "system-service";
  if (toolName.includes("memory") || toolName.includes("compaction")) return "memory";
  if (toolName.includes("worker")) return "worker";
  if (toolName.includes("search") || toolName.includes("crawler") || toolName.includes("website")) return "data";
  if (toolName.includes("echo") || toolName.includes("time") || toolName.includes("clock")) return "utility";
  return "general";
};

const isSystemService = (toolName: string): boolean => {
  return SYSTEM_SERVICE_TOOLS.includes(toolName);
};

const getCategoryIcon = (category: string): string => {
  switch (category) {
    case "system-service": return "⚡";
    case "memory": return "🧠";
    case "worker": return "⚙️";
    case "data": return "🔍";
    case "utility": return "🛠️";
    default: return "📦";
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case "system-service": return "var(--accent)";
    case "memory": return "var(--info)";
    case "worker": return "var(--warning)";
    case "data": return "var(--success)";
    case "utility": return "var(--muted)";
    default: return "var(--text-soft)";
  }
};

const getStatusIcon = (status?: string): string => {
  switch (status) {
    case "error": return "❌";
    case "warning": return "⚠️";
    case "healthy": return "✓";
    default: return "";
  }
};

const formatToolName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface ToolboxPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ToolboxPanel: React.FC<ToolboxPanelProps> = ({ isOpen, onToggle }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const panel = target.closest('.slide-panel-right');
      if (!panel) {
        onToggle();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tools");
      const data = await response.json();
      if (data.ok) {
        // Mock status for demonstration (backend will provide this later)
        const toolsWithStatus = data.data.map((tool: Tool) => ({
          ...tool,
          status: tool.enabled ? "healthy" : undefined,
          enabledForPersona: tool.enabled,
          enabledForWorker: false
        }));
        setTools(toolsWithStatus);
      } else {
        setError("Failed to load tools");
      }
    } catch (err) {
      setError("Failed to load tools");
      console.error("Error fetching tools:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = async (toolName: string, currentEnabled: boolean) => {
    try {
      const endpoint = currentEnabled ? "disable" : "enable";
      const response = await fetch(`/api/tools/${toolName}/${endpoint}`, {
        method: "POST"
      });
      const data = await response.json();
      if (data.ok) {
        setTools(prevTools =>
          prevTools.map(tool =>
            tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool
          )
        );
      } else {
        setError(`Failed to ${endpoint} tool: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setError(`Failed to ${currentEnabled ? "disable" : "enable"} tool`);
      console.error("Error toggling tool:", err);
    }
  };

  const toggleToolForContext = async (toolName: string, context: "persona" | "worker", currentEnabled: boolean) => {
    // TODO: Implement backend API for context-specific enable/disable
    setTools(prevTools =>
      prevTools.map(tool =>
        tool.name === toolName
          ? {
              ...tool,
              [context === "persona" ? "enabledForPersona" : "enabledForWorker"]: !currentEnabled
            }
          : tool
      )
    );
  };

  const toggleToolExpand = (toolName: string) => {
    setExpandedTool(expandedTool === toolName ? null : toolName);
  };

  const enabledCount = tools.filter(t => t.enabled).length;
  const errorCount = tools.filter(t => t.status === "error").length;
  const warningCount = tools.filter(t => t.status === "warning").length;
  const problemCount = errorCount + warningCount;
  const unavailableCount = tools.length - enabledCount;
  
  return (
    <div 
      className={`slide-panel slide-panel-right slide-panel-toolbox ${isOpen ? 'slide-panel-expanded' : ''}`}
    >
      {/* Morphing Button/Header */}
      <button 
        className={`slide-panel-morph ${isOpen ? 'slide-panel-morph-expanded' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={isOpen ? "Click to close" : "Show Toolbox"}
      >
        <div className="slide-panel-morph-content">
          <ToolboxIcon />
          <span className="slide-panel-morph-title">Toolbox</span>
          <span className="slide-panel-morph-count">{enabledCount}/{tools.length}</span>
        </div>
        {!isOpen && unavailableCount > 0 && (
          <span className="slide-panel-badge slide-panel-badge-error">{unavailableCount}</span>
        )}
      </button>
      
      <div className="slide-panel-content">
        {error && (
          <div className="panel-error">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div className="panel-empty">Loading...</div>
        ) : tools.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-icon">🔧</div>
            <div className="panel-empty-text">No tools available</div>
          </div>
        ) : (
          <div className="toolbox-list-compact">
            {/* System Services First */}
            {tools.filter(t => isSystemService(t.name)).length > 0 && (
              <>
                {(() => {
                  const systemServices = tools.filter(t => isSystemService(t.name));
                  const hasUnhealthySystemServices = systemServices.some(t => t.status === "error" || t.status === "warning");
                  return (
                    <div className={`toolbox-group-header ${hasUnhealthySystemServices ? "toolbox-group-header-unhealthy" : ""}`}>
                      System Services
                    </div>
                  );
                })()}
                {tools.filter(t => isSystemService(t.name)).map((tool) => {
                  const category = getToolCategory(tool.name);
                  const categoryIcon = getCategoryIcon(category);
                  const categoryColor = getCategoryColor(category);
                  const isUnavailable = tool.status === "error" || !tool.enabled;
                  const isExpanded = expandedTool === tool.name;
                  
                  return (
                    <div 
                      key={tool.name} 
                      className={`toolbox-card toolbox-card-system ${tool.status === "error" ? "toolbox-card-error" : ""} ${tool.status === "warning" ? "toolbox-card-warning" : ""} ${isUnavailable ? "toolbox-card-unavailable" : ""} ${isExpanded ? "toolbox-card-expanded" : ""}`}
                    >
                      <div className="toolbox-card-header">
                        <button 
                          className="toolbox-card-header-btn"
                          onClick={() => toggleToolExpand(tool.name)}
                        >
                          <div 
                            className="toolbox-category-icon" 
                            style={{ color: categoryColor }}
                          >
                            {categoryIcon}
                          </div>
                          <div className="toolbox-info">
                            <span className="toolbox-name">{formatToolName(tool.name)}</span>
                          </div>
                          <div className="toolbox-access-indicators">
                            <div
                              role="button"
                              tabIndex={0}
                              className={`toolbox-access-dot toolbox-access-persona ${tool.enabledForPersona ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!["tool_registry", "scheduler", "worker_manager"].includes(tool.name) && !isUnavailable) {
                                  toggleToolForContext(tool.name, "persona", tool.enabledForPersona || false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!["tool_registry", "scheduler", "worker_manager"].includes(tool.name) && !isUnavailable) {
                                    toggleToolForContext(tool.name, "persona", tool.enabledForPersona || false);
                                  }
                                }
                              }}
                              title="Enable for Persona"
                              aria-disabled={["tool_registry", "scheduler", "worker_manager"].includes(tool.name) || isUnavailable}
                            />
                            <div
                              role="button"
                              tabIndex={0}
                              className={`toolbox-access-dot toolbox-access-worker ${tool.enabledForWorker ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!["tool_registry", "scheduler", "worker_manager"].includes(tool.name) && !isUnavailable) {
                                  toggleToolForContext(tool.name, "worker", tool.enabledForWorker || false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!["tool_registry", "scheduler", "worker_manager"].includes(tool.name) && !isUnavailable) {
                                    toggleToolForContext(tool.name, "worker", tool.enabledForWorker || false);
                                  }
                                }
                              }}
                              title="Enable for Worker"
                              aria-disabled={["tool_registry", "scheduler", "worker_manager"].includes(tool.name) || isUnavailable}
                            />
                          </div>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="toolbox-card-body">
                          <div className="toolbox-details">
                            <div className="toolbox-detail-section">
                              <h4 className="toolbox-detail-section-title">Description</h4>
                              <p className="toolbox-detail-text">{tool.description}</p>
                            </div>
                            
                            <div className="toolbox-detail-section">
                              <h4 className="toolbox-detail-section-title">Status</h4>
                              <div className="toolbox-status-badge">
                                {tool.status === "error" && (
                                  <span className="toolbox-status-error">
                                    <span className="toolbox-status-icon">❌</span>
                                    <span>Error</span>
                                  </span>
                                )}
                                {tool.status === "warning" && (
                                  <span className="toolbox-status-warning">
                                    <span className="toolbox-status-icon">⚠️</span>
                                    <span>Warning</span>
                                  </span>
                                )}
                                {tool.status === "healthy" && (
                                  <span className="toolbox-status-healthy">
                                    <span className="toolbox-status-icon">✓</span>
                                    <span>Healthy</span>
                                  </span>
                                )}
                                {!tool.status && (
                                  <span className="toolbox-status-unknown">
                                    <span>Unknown</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {tool.status === "error" && (
                              <div className="toolbox-detail-section toolbox-error-section">
                                <h4 className="toolbox-detail-section-title">Error Details</h4>
                                <div className="toolbox-error-message">
                                  {tool.lastError || "Tool is not available or has encountered an error."}
                                </div>
                              </div>
                            )}

                            <div className="toolbox-detail-section">
                              <h4 className="toolbox-detail-section-title">Configuration</h4>
                              <div className="toolbox-config-row">
                                <span className="toolbox-config-label">Enabled:</span>
                                <span className={`toolbox-config-value ${tool.enabled ? "enabled" : "disabled"}`}>
                                  {tool.enabled ? "Yes" : "No"}
                                </span>
                              </div>
                              <div className="toolbox-config-row">
                                <span className="toolbox-config-label">Persona Access:</span>
                                <span className={`toolbox-config-value ${tool.enabledForPersona ? "enabled" : "disabled"}`}>
                                  {tool.enabledForPersona ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                              <div className="toolbox-config-row">
                                <span className="toolbox-config-label">Worker Access:</span>
                                <span className={`toolbox-config-value ${tool.enabledForWorker ? "enabled" : "disabled"}`}>
                                  {tool.enabledForWorker ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            
            {/* Regular Tools */}
            {tools.filter(t => !isSystemService(t.name)).length > 0 && (
              <>
                <div className="toolbox-group-header">Tools</div>
                {tools.filter(t => !isSystemService(t.name)).map((tool) => {
                  const category = getToolCategory(tool.name);
                  const categoryIcon = getCategoryIcon(category);
                  const categoryColor = getCategoryColor(category);
                  const isUnavailable = tool.status === "error" || !tool.enabled;
                  const isExpanded = expandedTool === tool.name;
                  
                  return (
                    <div 
                      key={tool.name} 
                      className={`toolbox-card ${tool.status === "error" ? "toolbox-card-error" : ""} ${tool.status === "warning" ? "toolbox-card-warning" : ""} ${isUnavailable ? "toolbox-card-unavailable" : ""} ${isExpanded ? "toolbox-card-expanded" : ""}`}
                    >
                      <div className="toolbox-card-header">
                        <button 
                          className="toolbox-card-header-btn"
                          onClick={() => toggleToolExpand(tool.name)}
                        >
                          <div 
                            className="toolbox-category-icon" 
                            style={{ color: categoryColor }}
                          >
                            {categoryIcon}
                          </div>
                          <div className="toolbox-info">
                            <span className="toolbox-name">{formatToolName(tool.name)}</span>
                          </div>
                          <div className="toolbox-access-indicators">
                            <div
                              role="button"
                              tabIndex={0}
                              className={`toolbox-access-dot toolbox-access-persona ${tool.enabledForPersona ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isUnavailable) {
                                  toggleToolForContext(tool.name, "persona", tool.enabledForPersona || false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isUnavailable) {
                                    toggleToolForContext(tool.name, "persona", tool.enabledForPersona || false);
                                  }
                                }
                              }}
                              title="Enable for Persona"
                              aria-disabled={isUnavailable}
                            />
                            <div
                              role="button"
                              tabIndex={0}
                              className={`toolbox-access-dot toolbox-access-worker ${tool.enabledForWorker ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isUnavailable) {
                                  toggleToolForContext(tool.name, "worker", tool.enabledForWorker || false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isUnavailable) {
                                    toggleToolForContext(tool.name, "worker", tool.enabledForWorker || false);
                                  }
                                }
                              }}
                              title="Enable for Worker"
                              aria-disabled={isUnavailable}
                            />
                          </div>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="toolbox-card-body">
                          <div className="toolbox-details">
                            <div className="toolbox-detail-section">
                              <h4 className="toolbox-detail-section-title">Description</h4>
                              <p className="toolbox-detail-text">{tool.description}</p>
                            </div>
                            
                            <div className="toolbox-detail-section">
                              <h4 className="toolbox-detail-section-title">Status</h4>
                              <div className="toolbox-status-badge">
                                {tool.status === "error" && (
                                  <span className="toolbox-status-error">
                                    <span className="toolbox-status-icon">❌</span>
                                    <span>Error</span>
                                  </span>
                                )}
                                {tool.status === "warning" && (
                                  <span className="toolbox-status-warning">
                                    <span className="toolbox-status-icon">⚠️</span>
                                    <span>Warning</span>
                                  </span>
                                )}
                                {tool.status === "healthy" && (
                                  <span className="toolbox-status-healthy">
                                    <span className="toolbox-status-icon">✓</span>
                                    <span>Healthy</span>
                                  </span>
                                )}
                                {!tool.status && (
                                  <span className="toolbox-status-unknown">
                                    <span>Unknown</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {tool.status === "error" && (
                              <div className="toolbox-detail-section toolbox-error-section">
                                <h4 className="toolbox-detail-section-title">Error Details</h4>
                                <div className="toolbox-error-message">
                                  {tool.lastError || "Tool is not available or has encountered an error."}
                                </div>
                              </div>
                            )}

                            <div className="toolbox-detail-section">
                              <h4 className="toolbox-detail-section-title">Configuration</h4>
                              <div className="toolbox-config-row">
                                <span className="toolbox-config-label">Enabled:</span>
                                <span className={`toolbox-config-value ${tool.enabled ? "enabled" : "disabled"}`}>
                                  {tool.enabled ? "Yes" : "No"}
                                </span>
                              </div>
                              <div className="toolbox-config-row">
                                <span className="toolbox-config-label">Persona Access:</span>
                                <span className={`toolbox-config-value ${tool.enabledForPersona ? "enabled" : "disabled"}`}>
                                  {tool.enabledForPersona ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                              <div className="toolbox-config-row">
                                <span className="toolbox-config-label">Worker Access:</span>
                                <span className={`toolbox-config-value ${tool.enabledForWorker ? "enabled" : "disabled"}`}>
                                  {tool.enabledForWorker ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

