import React, { useState, useEffect } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { ToolboxIcon } from "./Icons";

interface ToolParameter {
  type: string;
  description?: string;
  properties?: Record<string, ToolParameter>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: any[];
  items?: ToolParameter;
}

interface Tool {
  name: string;
  shortDescription: string;
  description: string;
  parameters?: ToolParameter;
  examples?: Array<{ description?: string; input?: any; output?: any; args?: any }>;
}

interface ToolSet {
  id: string;
  name: string;
  type: "system" | "internal" | "external";
  health: {
    status: "healthy" | "unhealthy" | "starting" | "stopped";
    timestamp: string;
    error?: string;
  };
}

interface ToolExecutionResult {
  ok: boolean;
  data?: any;
  error?: string;
}

const getToolSetTypeIcon = (type: string): string => {
  switch (type) {
    case "system": return "⚡";
    case "internal": return "🔧";
    case "external": return "🌐";
    default: return "📦";
  }
};

const getToolSetTypeColor = (type: string): string => {
  switch (type) {
    case "system": return "var(--accent)";
    case "internal": return "var(--info)";
    case "external": return "var(--success)";
    default: return "var(--muted)";
  }
};

const formatToolSetName = (name: string): string => {
  return name
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatToolName = (name: string): string => {
  // Convert to Title Case: replace underscores with spaces and capitalize each word
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Tag Input Component
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  description?: string;
  required?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ value, onChange, label, description, required }) => {
  const [newTag, setNewTag] = useState("");

  const tags = Array.isArray(value) ? value : [];

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="toolbox-form-group">
      <label className="toolbox-form-label">
        {label}
        {required && <span className="toolbox-form-required">*</span>}
      </label>
      {description && (
        <p className="toolbox-form-description">{description}</p>
      )}
      <div className="toolbox-tags-container">
        <div className="toolbox-tags-list">
          {tags.map((tag: string, idx: number) => (
            <div key={idx} className="toolbox-tag">
              <span className="toolbox-tag-text">{tag}</span>
              <button
                type="button"
                className="toolbox-tag-remove"
                onClick={() => removeTag(tag)}
                title="Remove tag"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="toolbox-tags-input-wrapper">
          <input
            type="text"
            className="toolbox-tags-input"
            placeholder="Add tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button
            type="button"
            className="toolbox-tags-add-btn"
            onClick={addTag}
            disabled={!newTag.trim() || tags.includes(newTag.trim())}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

// JSON Schema to form field converter
const renderFormField = (
  key: string,
  param: ToolParameter,
  value: any,
  onChange: (key: string, value: any) => void,
  required: boolean = false,
  path: string = ""
): JSX.Element => {
  const fieldKey = path ? `${path}.${key}` : key;
  const fieldId = `tool-param-${fieldKey.replace(/\./g, '-')}`;

  if (param.type === "object" && param.properties) {
    return (
      <div key={key} className="toolbox-form-group">
        <label className="toolbox-form-label">
          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
          {required && <span className="toolbox-form-required">*</span>}
        </label>
        {param.description && (
          <p className="toolbox-form-description">{param.description}</p>
        )}
        <div className="toolbox-form-nested">
          {Object.entries(param.properties).map(([propKey, propParam]) => {
            const nestedValue = value?.[propKey];
            const isRequired = param.required?.includes(propKey) || false;
            return renderFormField(
              propKey,
              propParam,
              nestedValue,
              (k, v) => {
                const newValue = { ...value, [k]: v };
                onChange(key, newValue);
              },
              isRequired,
              fieldKey
            );
          })}
        </div>
      </div>
    );
  }

  if (param.type === "array" && param.items) {
    // Special handling for tags (array of strings)
    if (key === "tags" && param.items.type === "string") {
      return (
        <TagInput
          key={key}
          value={Array.isArray(value) ? value : []}
          onChange={(tags) => onChange(key, tags)}
          label={key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
          description={param.description}
          required={required}
        />
      );
    }

    // Default array handling (JSON textarea)
    return (
      <div key={key} className="toolbox-form-group">
        <label className="toolbox-form-label">
          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
          {required && <span className="toolbox-form-required">*</span>}
        </label>
        {param.description && (
          <p className="toolbox-form-description">{param.description}</p>
        )}
        <textarea
          id={fieldId}
          className="toolbox-form-input"
          placeholder="Enter JSON array, e.g. [1, 2, 3]"
          value={Array.isArray(value) ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(key, parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
        />
      </div>
    );
  }

  if (param.enum) {
    return (
      <div key={key} className="toolbox-form-group">
        <label className="toolbox-form-label" htmlFor={fieldId}>
          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
          {required && <span className="toolbox-form-required">*</span>}
        </label>
        {param.description && (
          <p className="toolbox-form-description">{param.description}</p>
        )}
        <select
          id={fieldId}
          className="toolbox-form-input"
          value={value || ""}
          onChange={(e) => onChange(key, e.target.value)}
        >
          <option value="">Select...</option>
          {param.enum.map((option) => (
            <option key={option} value={option}>
              {String(option)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (param.type === "boolean") {
    return (
      <div key={key} className="toolbox-form-group">
        <label className="toolbox-form-checkbox">
          <input
            id={fieldId}
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          <span>
            {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
            {required && <span className="toolbox-form-required">*</span>}
          </span>
        </label>
        {param.description && (
          <p className="toolbox-form-description">{param.description}</p>
        )}
      </div>
    );
  }

  if (param.type === "number" || param.type === "integer") {
    return (
      <div key={key} className="toolbox-form-group">
        <label className="toolbox-form-label" htmlFor={fieldId}>
          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
          {required && <span className="toolbox-form-required">*</span>}
        </label>
        {param.description && (
          <p className="toolbox-form-description">{param.description}</p>
        )}
        <input
          id={fieldId}
          type="number"
          className="toolbox-form-input"
          value={value || ""}
          onChange={(e) => onChange(key, param.type === "integer" ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
        />
      </div>
    );
  }

  // Default: string or unknown
  return (
    <div key={key} className="toolbox-form-group">
      <label className="toolbox-form-label" htmlFor={fieldId}>
        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
        {required && <span className="toolbox-form-required">*</span>}
      </label>
      {param.description && (
        <p className="toolbox-form-description">{param.description}</p>
      )}
      <input
        id={fieldId}
        type="text"
        className="toolbox-form-input"
        value={value || ""}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={param.description}
      />
    </div>
  );
};

interface ToolboxPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ToolboxPanel: React.FC<ToolboxPanelProps> = ({ isOpen, onToggle }) => {
  const [toolSets, setToolSets] = useState<ToolSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedToolSet, setExpandedToolSet] = useState<string | null>(null);
  const [tools, setTools] = useState<Record<string, Tool[]>>({});
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});
  const [expandedTool, setExpandedTool] = useState<Record<string, string | null>>({});
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, ToolExecutionResult>>({});
  const [toolArgs, setToolArgs] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    if (isOpen) {
      fetchToolSets();
    }
  }, [isOpen]);

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

  const fetchToolSets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tool-sets");
      const data = await response.json();
      if (data.ok) {
        setToolSets(data.data);
      } else {
        setError("Failed to load tool sets");
      }
    } catch (err) {
      setError("Failed to load tool sets");
      console.error("Error fetching tool sets:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchToolsForToolSet = async (toolSetId: string) => {
    if (tools[toolSetId]) {
      return; // Already loaded
    }

    setLoadingTools(prev => ({ ...prev, [toolSetId]: true }));
    try {
      const response = await fetch(`/api/tool-sets/${toolSetId}/tools`);
      const data = await response.json();
      if (data.ok) {
        setTools(prev => ({ ...prev, [toolSetId]: data.data }));
      } else {
        setError(`Failed to load tools for ${toolSetId}`);
      }
    } catch (err) {
      setError(`Failed to load tools for ${toolSetId}`);
      console.error("Error fetching tools:", err);
    } finally {
      setLoadingTools(prev => ({ ...prev, [toolSetId]: false }));
    }
  };

  const toggleToolSetExpand = (toolSetId: string) => {
    if (expandedToolSet === toolSetId) {
      setExpandedToolSet(null);
    } else {
      setExpandedToolSet(toolSetId);
      fetchToolsForToolSet(toolSetId);
    }
  };

  const toggleToolExpand = (toolSetId: string, toolName: string) => {
    const key = `${toolSetId}:${toolName}`;
    if (expandedTool[toolSetId] === toolName) {
      setExpandedTool(prev => ({ ...prev, [toolSetId]: null }));
    } else {
      setExpandedTool(prev => ({ ...prev, [toolSetId]: toolName }));
      const tool = tools[toolSetId]?.find(t => t.name === toolName);
      if (tool?.examples && tool.examples.length > 0 && !toolArgs[key]) {
        const example = tool.examples[0];
        setToolArgs(prev => ({
          ...prev,
          [key]: example.args || example.input || {}
        }));
      } else if (!toolArgs[key]) {
        setToolArgs(prev => ({
          ...prev,
          [key]: {}
        }));
      }
    }
  };

  const handleArgChange = (toolSetId: string, toolName: string, key: string, value: any) => {
    const argKey = `${toolSetId}:${toolName}`;
    setToolArgs(prev => {
      const currentArgs = prev[argKey] || {};
      const newArgs = { ...currentArgs };
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        newArgs[parent] = { ...newArgs[parent], [child]: value };
      } else {
        newArgs[key] = value;
      }
      return { ...prev, [argKey]: newArgs };
    });
  };

  const executeTool = async (toolSetId: string, toolName: string) => {
    const fullToolName = `${toolSetId}:${toolName}`;
    setExecutingTool(fullToolName);
    setError(null);

    try {
      const args = toolArgs[fullToolName] || {};
      const response = await fetch(`/api/tools/${toolName}/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ args })
      });

      const data = await response.json();
      setExecutionResults(prev => ({
        ...prev,
        [fullToolName]: {
          ok: data.ok,
          data: data.data,
          error: data.error
        }
      }));
    } catch (err) {
      setExecutionResults(prev => ({
        ...prev,
        [fullToolName]: {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to execute tool"
        }
      }));
    } finally {
      setExecutingTool(null);
    }
  };

  const loadExample = (toolSetId: string, toolName: string, example: any) => {
    const key = `${toolSetId}:${toolName}`;
    setToolArgs(prev => ({
      ...prev,
      [key]: example.args || example.input || {}
    }));
  };

  const healthyCount = toolSets.filter(ts => ts.health.status === "healthy").length;
  const unhealthyCount = toolSets.length - healthyCount;

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
          <span className="slide-panel-morph-count">{healthyCount}/{toolSets.length}</span>
        </div>
        {!isOpen && unhealthyCount > 0 && (
          <span className="slide-panel-badge slide-panel-badge-error">{unhealthyCount}</span>
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
        ) : toolSets.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-icon">🔧</div>
            <div className="panel-empty-text">No tool sets available</div>
          </div>
        ) : (
          <div className="toolbox-list-compact">
            {toolSets.map((toolSet) => (
              <ToolSetCard
                key={toolSet.id}
                toolSet={toolSet}
                isExpanded={expandedToolSet === toolSet.id}
                onToggleExpand={() => toggleToolSetExpand(toolSet.id)}
                tools={tools[toolSet.id] || []}
                loadingTools={loadingTools[toolSet.id] || false}
                expandedTool={expandedTool[toolSet.id] || null}
                onToggleTool={(toolName) => toggleToolExpand(toolSet.id, toolName)}
                onExecute={(toolName) => executeTool(toolSet.id, toolName)}
                executing={executingTool}
                executionResults={executionResults}
                toolArgs={toolArgs}
                onArgChange={(toolName, key, value) => handleArgChange(toolSet.id, toolName, key, value)}
                onLoadExample={(toolName, example) => loadExample(toolSet.id, toolName, example)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ToolSetCardProps {
  toolSet: ToolSet;
  isExpanded: boolean;
  onToggleExpand: () => void;
  tools: Tool[];
  loadingTools: boolean;
  expandedTool: string | null;
  onToggleTool: (toolName: string) => void;
  onExecute: (toolName: string) => void;
  executing: string | null;
  executionResults: Record<string, ToolExecutionResult>;
  toolArgs: Record<string, Record<string, any>>;
  onArgChange: (toolName: string, key: string, value: any) => void;
  onLoadExample: (toolName: string, example: any) => void;
}

const ToolSetCard: React.FC<ToolSetCardProps> = ({
  toolSet,
  isExpanded,
  onToggleExpand,
  tools,
  loadingTools,
  expandedTool,
  onToggleTool,
  onExecute,
  executing,
  executionResults,
  toolArgs,
  onArgChange,
  onLoadExample
}) => {
  const typeIcon = getToolSetTypeIcon(toolSet.type);
  const typeColor = getToolSetTypeColor(toolSet.type);
  const isHealthy = toolSet.health.status === "healthy";
  const isUnhealthy = toolSet.health.status === "unhealthy" || toolSet.health.status === "stopped";

  return (
    <div 
      className={`toolbox-card ${toolSet.type === "system" ? "toolbox-card-system" : ""} ${isUnhealthy ? "toolbox-card-error" : ""} ${isExpanded ? "toolbox-card-expanded" : ""}`}
    >
      <div className="toolbox-card-header">
        <button 
          className="toolbox-card-header-btn"
          onClick={onToggleExpand}
        >
          <div 
            className="toolbox-category-icon" 
            style={{ color: typeColor }}
          >
            {typeIcon}
          </div>
          <div className="toolbox-info">
            <span className="toolbox-name">{formatToolSetName(toolSet.name)}</span>
            <span className="toolbox-short-desc">{toolSet.type}</span>
          </div>
          <div className="toolbox-status-indicator">
            {isHealthy ? (
              <span className="toolbox-status-dot toolbox-status-healthy" title="Healthy" />
            ) : (
              <span className="toolbox-status-dot toolbox-status-error" title={toolSet.health.error || "Unhealthy"} />
            )}
          </div>
        </button>
      </div>
      
      {isExpanded && (
        <div className="toolbox-card-body">
          <div className="toolbox-details">
            <div className="toolbox-detail-section">
              {loadingTools ? (
                <div className="toolbox-loading">Loading tools...</div>
              ) : tools.length === 0 ? (
                <div className="toolbox-empty">No tools available</div>
              ) : (
                <div className="toolbox-tools-list">
                  {tools.map((tool) => {
                    const toolKey = `${toolSet.id}:${tool.name}`;
                    const isToolExpanded = expandedTool === tool.name;
                    return (
                      <ToolCard
                        key={tool.name}
                        tool={tool}
                        toolSetId={toolSet.id}
                        isExpanded={isToolExpanded}
                        onToggleExpand={() => onToggleTool(tool.name)}
                        onExecute={() => onExecute(tool.name)}
                        executing={executing === toolKey}
                        executionResult={executionResults[toolKey] || null}
                        toolArgs={toolArgs[toolKey] || {}}
                        onArgChange={(key, value) => onArgChange(tool.name, key, value)}
                        onLoadExample={(example) => onLoadExample(tool.name, example)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ToolCardProps {
  tool: Tool;
  toolSetId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onExecute: () => void;
  executing: boolean;
  executionResult: ToolExecutionResult | null;
  toolArgs: Record<string, any>;
  onArgChange: (key: string, value: any) => void;
  onLoadExample: (example: any) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isExpanded,
  onToggleExpand,
  onExecute,
  executing,
  executionResult,
  toolArgs,
  onArgChange,
  onLoadExample
}) => {
  const renderForm = () => {
    if (!tool.parameters || !tool.parameters.properties) {
      return (
        <div className="toolbox-form-empty">
          <p>This tool has no parameters.</p>
        </div>
      );
    }

    const required = tool.parameters.required || [];
    return (
      <div className="toolbox-form">
        {Object.entries(tool.parameters.properties).map(([key, param]) => {
          const isRequired = required.includes(key);
          return renderFormField(key, param, toolArgs[key], (k, v) => onArgChange(k, v), isRequired);
        })}
      </div>
    );
  };

  return (
    <div className={`toolbox-tool-card ${isExpanded ? "toolbox-tool-card-expanded" : ""}`}>
      <button className="toolbox-tool-header" onClick={onToggleExpand}>
          <div className="toolbox-tool-header-content">
          <div className="toolbox-tool-icon">⚙️</div>
          <div className="toolbox-tool-info">
            <span className="toolbox-tool-name">{formatToolName(tool.name)}</span>
            <span className="toolbox-tool-short-desc">{tool.shortDescription}</span>
          </div>
          <div className="toolbox-tool-expand-icon">
            {isExpanded ? "▼" : "▶"}
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="toolbox-tool-body">
          <div className="toolbox-tool-description-section">
            <p className="toolbox-tool-description-text">{tool.description}</p>
          </div>

          {tool.parameters && tool.parameters.properties && Object.keys(tool.parameters.properties).length > 0 && (
            <div className="toolbox-tool-execute-section">
              
              {tool.examples && tool.examples.length > 0 && (
                <div className="toolbox-examples">
                  <p className="toolbox-examples-label">💡 Examples:</p>
                  <div className="toolbox-examples-list">
                    {tool.examples.map((example, idx) => (
                      <button
                        key={idx}
                        className="toolbox-example-btn"
                        onClick={() => onLoadExample(example)}
                      >
                        {example.description || `Example ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {renderForm()}
              
              <button
                className="toolbox-execute-btn"
                onClick={onExecute}
                disabled={executing}
              >
                {executing ? (
                  <>
                    <span className="toolbox-execute-icon">⏳</span>
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <span className="toolbox-execute-icon">▶</span>
                    <span>Execute Tool</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!tool.parameters || !tool.parameters.properties || Object.keys(tool.parameters.properties).length === 0 ? (
            <div className="toolbox-tool-execute-section">
              <button
                className="toolbox-execute-btn"
                onClick={onExecute}
                disabled={executing}
              >
                {executing ? (
                  <>
                    <span className="toolbox-execute-icon">⏳</span>
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <span className="toolbox-execute-icon">▶</span>
                    <span>Execute Tool</span>
                  </>
                )}
              </button>
            </div>
          ) : null}

          {executionResult && (
            <div className="toolbox-tool-result-section">
              <div className={`toolbox-result ${executionResult.ok ? "toolbox-result-success" : "toolbox-result-error"}`}>
                {executionResult.ok ? (
                  <div>
                    <div className="toolbox-result-header">
                      <span className="toolbox-result-icon">✓</span>
                      <span>Success</span>
                    </div>
                    <pre className="toolbox-result-data">
                      {JSON.stringify(executionResult.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className="toolbox-result-header">
                      <span className="toolbox-result-icon">✗</span>
                      <span>Error</span>
                    </div>
                    <div className="toolbox-result-error-text">
                      {executionResult.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
