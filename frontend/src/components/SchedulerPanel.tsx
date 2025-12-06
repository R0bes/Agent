import React, { useState, useEffect } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { IconButton } from "./IconButton";
import { ClockIcon, CalendarIcon, RepeatIcon, TrashIcon } from "./Icons";

// Helper: Convert date/time to cron expression
const dateToCron = (date: string, time: string): string => {
  const d = new Date(`${date}T${time}`);
  const minutes = d.getMinutes();
  const hours = d.getHours();
  const dayOfMonth = d.getDate();
  const month = d.getMonth() + 1;
  return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
};

// Helper: Convert cron to date/time
const cronToDateTime = (cron: string): { date: string; time: string; isRecurring: boolean } => {
  const parts = cron.split(' ');
  if (parts.length < 5) return { date: '', time: '', isRecurring: false };
  
  const [minute, hour, day, month] = parts;
  const isRecurring = day === '*' || month === '*';
  
  if (isRecurring) {
    // For recurring tasks, show the time part only
    return { 
      date: '', 
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, 
      isRecurring: true 
    };
  }
  
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const timeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  
  return { date: dateStr, time: timeStr, isRecurring: false };
};

type TaskType = "tool_call" | "event";

interface ScheduledTask {
  id: string;
  type: TaskType;
  schedule: string;
  payload: {
    eventTopic: string;
    toolName?: string;
    args?: any;
    eventPayload?: any;
  };
  userId: string;
  conversationId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
}

interface Tool {
  name: string;
  shortDescription: string;
}

interface SchedulerPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({ isOpen, onToggle }) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  
  // Form state
  const [formType, setFormType] = useState<TaskType>("tool_call");
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formRecurringPattern, setFormRecurringPattern] = useState("daily");
  const [formToolName, setFormToolName] = useState("");
  const [formArgs, setFormArgs] = useState("{}");
  const [formEventTopic, setFormEventTopic] = useState("");
  const [formEventPayload, setFormEventPayload] = useState("{}");
  
  const { ws } = useWebSocket();
  const userId = "user-123";
  const conversationId = "main";

  // Listen to WebSocket for task updates
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "scheduler_task_updated") {
          setTasks(data.payload.tasks || []);
        }
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws]);

  // Fetch tasks and tools on mount
  useEffect(() => {
    fetchTasks();
    fetchTools();
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const panel = target.closest('.slide-panel-left');
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

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scheduler/tasks");
      const data = await response.json();
      if (data.ok) {
        setTasks(data.data);
      } else {
        setError("Failed to load tasks");
      }
    } catch (err) {
      setError("Failed to load tasks");
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch("/api/tools");
      const data = await response.json();
      if (data.ok) {
        setTools(data.data.filter((t: any) => t.enabled));
      }
    } catch (err) {
      console.error("Error fetching tools:", err);
    }
  };

  const handleCreateTask = async () => {
    setError(null);
    try {
      let payload: any = {};
      
      if (!formEventTopic) {
        setError("Event topic is required");
        return;
      }
      
      if (formType === "tool_call") {
        if (!formToolName) {
          setError("Tool name is required");
          return;
        }
        payload = {
          toolName: formToolName,
          args: JSON.parse(formArgs),
          eventTopic: formEventTopic
        };
      } else if (formType === "event") {
        payload = { 
          eventTopic: formEventTopic,
          eventPayload: JSON.parse(formEventPayload)
        };
      }

      // Generate cron expression
      let cronExpression = "";
      if (formIsRecurring) {
        const [hour, minute] = formTime.split(':');
        switch (formRecurringPattern) {
          case "daily":
            cronExpression = `${minute} ${hour} * * *`;
            break;
          case "weekly":
            cronExpression = `${minute} ${hour} * * 1`; // Monday
            break;
          case "hourly":
            cronExpression = `${minute} * * * *`;
            break;
          default:
            cronExpression = `${minute} ${hour} * * *`;
        }
      } else {
        if (!formDate) {
          setError("Date is required for one-time tasks");
          return;
        }
        cronExpression = dateToCron(formDate, formTime);
      }

      const response = await fetch("/api/scheduler/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          schedule: cronExpression,
          payload,
          userId,
          conversationId,
          enabled: true
        })
      });

      const data = await response.json();
      if (data.ok) {
        setShowForm(false);
        resetForm();
        await fetchTasks();
      } else {
        setError(data.error || "Failed to create task");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create task");
      console.error("Error creating task:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduler/tasks/${id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.ok) {
        await fetchTasks();
      } else {
        setError(data.error || "Failed to delete task");
      }
    } catch (err) {
      setError("Failed to delete task");
      console.error("Error deleting task:", err);
    }
  };

  const handleToggleTask = async (id: string, currentEnabled: boolean) => {
    try {
      const endpoint = currentEnabled ? "disable" : "enable";
      const response = await fetch(`/api/scheduler/tasks/${id}/${endpoint}`, {
        method: "POST"
      });
      const data = await response.json();
      if (data.ok) {
        await fetchTasks();
      } else {
        setError(data.error || `Failed to ${endpoint} task`);
      }
    } catch (err) {
      setError(`Failed to ${currentEnabled ? "disable" : "enable"} task`);
      console.error("Error toggling task:", err);
    }
  };

  const resetForm = () => {
    setFormType("tool_call");
    setFormIsRecurring(false);
    setFormDate("");
    setFormTime("09:00");
    setFormRecurringPattern("daily");
    setFormToolName("");
    setFormArgs("{}");
    setFormEventTopic("");
    setFormEventPayload("{}");
    setEditingTask(null);
  };

  const getTaskDisplayName = (task: ScheduledTask): string => {
    if (task.type === "tool_call") {
      return task.payload.toolName || "Unknown Tool";
    } else if (task.type === "event") {
      return task.payload.eventTopic || "Custom Event";
    }
    return task.type;
  };

  // Format cron to human-readable date/time
  const formatSchedule = (cron: string): string => {
    const { date, time, isRecurring } = cronToDateTime(cron);
    
    if (isRecurring) {
      const parts = cron.split(' ');
      const [minute, hour, day, month, weekday] = parts;
      
      if (weekday && weekday !== '*') {
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Every ${weekdays[parseInt(weekday)]} at ${time}`;
      } else if (day === '*' && month === '*') {
        if (minute === '*') {
          return `Every hour at :${hour.padStart(2, '0')}`;
        }
        return `Daily at ${time}`;
      } else if (day !== '*' && month === '*') {
        return `Every ${day} of month at ${time}`;
      }
      return `Recurring at ${time}`;
    } else {
      if (date && time) {
        const dateObj = new Date(`${date}T${time}`);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const taskDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        
        const daysDiff = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          return `Today at ${time}`;
        } else if (daysDiff === 1) {
          return `Tomorrow at ${time}`;
        } else if (daysDiff === -1) {
          return `Yesterday at ${time}`;
        } else {
          return `${dateObj.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} at ${time}`;
        }
      }
      return time || cron;
    }
  };

  return (
    <div className={`slide-panel slide-panel-left ${isOpen ? 'slide-panel-expanded' : ''}`}>
      {/* Morphing Button/Header */}
      <div 
        className={`slide-panel-morph ${isOpen ? 'slide-panel-morph-expanded' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        title={isOpen ? "Click to close" : "Show Scheduler"}
        role="button"
        tabIndex={0}
      >
        <div className="slide-panel-morph-content">
          <ClockIcon />
          <span className="slide-panel-morph-title">Scheduler</span>
          <span className="slide-panel-morph-count">{tasks.length}</span>
          {isOpen && (
            <IconButton
              icon={<span>{showForm ? "×" : "+"}</span>}
              onClick={(e) => {
                e.stopPropagation();
                setShowForm(!showForm);
              }}
              title={showForm ? "Cancel" : "New Task"}
              variant="ghost"
              size="sm"
              className="scheduler-header-new-btn"
            />
          )}
        </div>
        {!isOpen && tasks.length > 0 && (
          <span className="slide-panel-badge">{tasks.length}</span>
        )}
      </div>
      
      <div className="slide-panel-content">

          {error && (
          <div className="panel-error">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {showForm && (
        <div className="scheduler-form">
          <div className="form-group">
            <label>Type</label>
            <select className="form-input" value={formType} onChange={(e) => setFormType(e.target.value as TaskType)}>
              <option value="tool_call">🔧 Tool Call</option>
              <option value="event">📅 Custom Event</option>
            </select>
          </div>

          <div className="form-group">
            <label>Event Topic (Target)</label>
            <input
              className="form-input"
              type="text"
              value={formEventTopic}
              onChange={(e) => setFormEventTopic(e.target.value)}
              placeholder="e.g., scheduled_reminder, daily_summary"
            />
            <small>The event topic where results will be sent</small>
          </div>

          <div className="form-group">
            <label>Schedule Type</label>
            <div className="form-radio-group">
              <label className="form-radio">
                <input
                  type="radio"
                  checked={!formIsRecurring}
                  onChange={() => setFormIsRecurring(false)}
                />
                <span>One-time</span>
              </label>
              <label className="form-radio">
                <input
                  type="radio"
                  checked={formIsRecurring}
                  onChange={() => setFormIsRecurring(true)}
                />
                <span>Recurring</span>
              </label>
            </div>
          </div>

          {!formIsRecurring ? (
            <div className="form-group">
              <label>Date & Time</label>
              <div className="form-datetime-group">
                <input
                  className="form-input"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  className="form-input"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Pattern</label>
                <select className="form-input" value={formRecurringPattern} onChange={(e) => setFormRecurringPattern(e.target.value)}>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  className="form-input"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </>
          )}

          {formType === "tool_call" && (
            <>
              <div className="form-group">
                <label>Tool</label>
                <select className="form-input" value={formToolName} onChange={(e) => setFormToolName(e.target.value)}>
                  <option value="">Select a tool...</option>
                  {tools.map((tool) => (
                    <option key={tool.name} value={tool.name}>
                      {tool.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Arguments (JSON)</label>
                <textarea
                  className="form-input"
                  value={formArgs}
                  onChange={(e) => setFormArgs(e.target.value)}
                  placeholder='{"param": "value"}'
                  rows={3}
                />
              </div>
            </>
          )}

          {formType === "event" && (
            <div className="form-group">
              <label>Event Payload (JSON)</label>
              <textarea
                className="form-input"
                value={formEventPayload}
                onChange={(e) => setFormEventPayload(e.target.value)}
                placeholder='{"message": "value", "data": {}}'
                rows={3}
              />
            </div>
          )}

          <div className="form-actions">
            <IconButton
              icon={<span>×</span>}
              onClick={() => { setShowForm(false); resetForm(); }}
              title="Cancel"
              variant="ghost"
            />
            <IconButton
              icon={<span>✓</span>}
              onClick={handleCreateTask}
              title="Create Task"
              variant="accent"
            />
          </div>
        </div>
        )}

        {loading ? (
          <div className="panel-empty">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-icon">⏰</div>
            <div className="panel-empty-text">No scheduled tasks</div>
          </div>
        ) : (
          <ul className="panel-list">
            {tasks.map((task) => (
              <li key={task.id} className="scheduler-task-card">
                <div className="task-card-header">
                  <div className="task-card-icon">
                    {task.type === "tool_call" ? (
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 7V10L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M3 4L10 2L17 4V9C17 13 14 16 10 18C6 16 3 13 3 9V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M7 9L9 11L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="task-card-info">
                    <div className="task-card-title">{getTaskDisplayName(task)}</div>
                    <div className="task-card-schedule-compact">
                      {formatSchedule(task.schedule)}
                    </div>
                  </div>
                  <div className="task-card-actions">
                    <button
                      className={`toggle-switch ${task.enabled ? "active" : ""}`}
                      onClick={() => handleToggleTask(task.id, task.enabled)}
                      title={task.enabled ? "Disable" : "Enable"}
                    />
                    <button
                      className="task-delete-btn"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

