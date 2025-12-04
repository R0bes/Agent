import React, { useState, useEffect } from "react";
import { IconButton } from "./IconButton";

interface Tool {
  name: string;
  shortDescription: string;
  description: string;
  enabled: boolean;
}

export const ToolsCard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTools();
    }
  }, [isOpen]);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tools");
      const data = await response.json();
      if (data.ok) {
        setTools(data.data);
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
        // Update local state
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

  return (
    <>
      <div className={`panel-card-overlay ${isOpen ? "panel-card-overlay-open" : ""}`} onClick={onClose} />
      <div className={`panel-card panel-card-settings ${isOpen ? "panel-card-open" : ""}`}>
        <div className="panel-card-inner">
          <div className="panel-card-front">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <span>🔧</span>
                <span>Tools</span>
              </div>
              <IconButton
                icon={<span>×</span>}
                onClick={onClose}
                title="Close"
                variant="ghost"
                size="sm"
              />
            </div>
            <div className="panel-card-body">
              {error && (
                <div className="panel-card-error" style={{ padding: "var(--spacing-sm)", marginBottom: "var(--spacing-sm)", background: "var(--error-bg)", color: "var(--error)", borderRadius: "var(--radius-sm)" }}>
                  {error}
                </div>
              )}
              {loading ? (
                <div className="panel-card-empty">
                  <div className="panel-card-empty-text">Loading tools...</div>
                </div>
              ) : tools.length === 0 ? (
                <div className="panel-card-empty">
                  <div className="panel-card-empty-icon">🔧</div>
                  <div className="panel-card-empty-text">No tools available</div>
                </div>
              ) : (
                <div className="settings-section">
                  <div className="settings-option" style={{ marginBottom: "var(--spacing-md)" }}>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "var(--spacing-sm)" }}>
                      {tools.filter(t => t.enabled).length} of {tools.length} tools enabled
                    </div>
                  </div>
                  <ul className="panel-card-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {tools.map((tool) => (
                      <li key={tool.name} className="panel-card-item" style={{ marginBottom: "var(--spacing-sm)" }}>
                        <div className="settings-option" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-md)" }}>
                          <div style={{ flex: 1 }}>
                            <div className="panel-card-item-title" style={{ fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>
                              {tool.name}
                              {tool.name === "tool_registry" && (
                                <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "var(--spacing-xs)" }}>(System)</span>
                              )}
                            </div>
                            <div className="panel-card-item-content" style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                              {tool.shortDescription}
                            </div>
                          </div>
                          <button
                            className={`settings-switch ${tool.enabled ? "active" : ""}`}
                            onClick={() => {
                              if (tool.name !== "tool_registry") {
                                toggleTool(tool.name, tool.enabled);
                              }
                            }}
                            disabled={tool.name === "tool_registry"}
                            title={tool.name === "tool_registry" ? "Cannot disable system tool" : tool.enabled ? "Disable tool" : "Enable tool"}
                            style={{ opacity: tool.name === "tool_registry" ? 0.5 : 1, cursor: tool.name === "tool_registry" ? "not-allowed" : "pointer" }}
                          >
                            <span className="settings-switch-slider"></span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="panel-card-back">
            <div className="panel-card-back-content">
              <div className="panel-card-back-icon">🔧</div>
              <div className="panel-card-back-text">Configuring...</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

