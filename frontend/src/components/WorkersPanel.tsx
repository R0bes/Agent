import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";
import { IconButton } from "./IconButton";
import { WorkersIcon, QueueIcon, PriorityHighIcon, PriorityNormalIcon, PriorityLowIcon } from "./Icons";

interface Worker {
  name: string;
  description: string;
  category: string;
  status: "idle" | "busy";
  activeJobs: number;
  totalProcessed: number;
  priority: "low" | "normal" | "high";
  maxRetries: number;
}

interface QueuedJob {
  id: string;
  workerName: string;
  status: string;
  createdAt: string;
  priority: number;
  args: any;
}

interface WorkersPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const WorkersPanel: React.FC<WorkersPanelProps> = ({ isOpen, onToggle }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<QueuedJob[]>([]);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [queueExpanded, setQueueExpanded] = useState(false);
  const panelExpanded = isOpen; // Use prop instead of local state

  // Close panel when clicking outside
  useEffect(() => {
    if (!panelExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const panel = target.closest('.workers-panel');
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
  }, [panelExpanded, onToggle]);

  // Close queue when clicking outside
  useEffect(() => {
    if (!queueExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const queuePanel = target.closest('.queue-panel');
      if (!queuePanel) {
        setQueueExpanded(false);
      }
    };

    // Delay adding the listener to avoid immediate trigger from the open click
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [queueExpanded]);

  useEffect(() => {
    // Initial load
    fetch("/api/workers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.workers)) {
          setWorkers(data.workers);
        }
      })
      .catch((err) => console.error("Failed to load workers", err));

    fetch("/api/jobs/queue")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.jobs)) {
          setQueuedJobs(data.jobs);
        }
      })
      .catch((err) => console.error("Failed to load queue", err));

    // Subscribe to updates
    const unsubscribe = subscribe((event) => {
      if (event.type === "worker_updated" && event.payload?.workers) {
        setWorkers(event.payload.workers as Worker[]);
      }
      if (event.type === "job_updated") {
        // Reload queue when jobs update
        fetch("/api/jobs/queue")
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data.jobs)) {
              setQueuedJobs(data.jobs);
            }
          })
          .catch((err) => console.error("Failed to reload queue", err));
      }
    });

    return unsubscribe;
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      memory: "🧠",
      tool: "🔧",
      think: "💭"
    };
    return icons[category] || "⚙️";
  };

  const formatWorkerName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleWorker = (workerName: string) => {
    setExpandedWorker(expandedWorker === workerName ? null : workerName);
  };

  const getPriorityIcon = (priority: number) => {
    if (priority > 0) return <PriorityHighIcon />;
    if (priority < 0) return <PriorityLowIcon />;
    return <PriorityNormalIcon />;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const cancelJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setQueuedJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      console.error("Failed to cancel job", err);
    }
  };

  return (
    <>
      {/* Panel Container */}
      <div className={`workers-panel ${panelExpanded ? 'workers-panel-open' : ''}`}>
        {/* Morphing Button/Header */}
        <button 
          className={`workers-panel-morph ${panelExpanded ? 'workers-panel-morph-expanded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={panelExpanded ? "Click to close" : "Show Workers"}
        >
          <div className="workers-panel-header">
            <WorkersIcon />
            <span className="workers-panel-header-title">Workers</span>
            <span className="workers-panel-header-count">{workers.length}</span>
          </div>
        </button>

        {/* Panel Body */}
        <div className="workers-panel-body">
          {/* Workers Section */}
          <div className="workers-section">
            <div className="workers-list-wrapper">
              {workers.length === 0 ? (
                <div className="workers-sidebar-empty">
                  <div className="workers-sidebar-empty-icon">⚙️</div>
                  <div className="workers-sidebar-empty-text">No workers</div>
                </div>
              ) : (
                <ul className="workers-list">
                  {workers.map((worker) => {
                    const isExpanded = expandedWorker === worker.name;
                    return (
                      <li key={worker.name} className={`worker-card worker-${worker.category} ${isExpanded ? 'worker-card-expanded' : ''}`}>
                        <div className="worker-card-header">
                          <button 
                            className="worker-card-header-btn"
                            onClick={() => toggleWorker(worker.name)}
                          >
                            <div className="worker-icon">{getCategoryIcon(worker.category)}</div>
                            <div className="worker-title">{formatWorkerName(worker.name)}</div>
                            <span className={`badge badge-${worker.status}`}>{worker.status}</span>
                            <span className="worker-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                          </button>
                        </div>
                        
                        {isExpanded && (
                          <div className="worker-card-body">
                            <div className="worker-detail-row">
                              <span className="worker-detail-label">Name:</span>
                              <span className="worker-detail-value">{worker.name}</span>
                            </div>
                            <div className="worker-detail-row">
                              <span className="worker-detail-label">Category:</span>
                              <span className="worker-detail-value">{worker.category}</span>
                            </div>
                            <div className="worker-detail-row">
                              <span className="worker-detail-label">Priority:</span>
                              <span className="worker-detail-value">{worker.priority}</span>
                            </div>
                            <div className="worker-detail-row">
                              <span className="worker-detail-label">Max Retries:</span>
                              <span className="worker-detail-value">{worker.maxRetries}</span>
                            </div>
                            <div className="worker-detail-row">
                              <span className="worker-detail-label">Active Jobs:</span>
                              <span className="worker-detail-value">{worker.activeJobs}</span>
                            </div>
                            <div className="worker-detail-row">
                              <span className="worker-detail-label">Total Processed:</span>
                              <span className="worker-detail-value">{worker.totalProcessed}</span>
                            </div>
                            <div className="worker-detail-description">
                              {worker.description}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Queue Panel - Slides up from bottom */}
          <div className={`queue-panel ${queueExpanded ? 'queue-panel-expanded' : ''}`}>
            {/* Morphing Button/Header */}
            <button 
              className={`queue-panel-morph ${queueExpanded ? 'queue-panel-morph-expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setQueueExpanded(!queueExpanded);
              }}
              title={queueExpanded ? "Click to close" : "Show Queue"}
            >
              <div className="queue-panel-morph-content">
                <QueueIcon />
                <span className="queue-panel-morph-title">Queue</span>
                <span className="queue-panel-morph-count">{queuedJobs.length}</span>
              </div>
              {!queueExpanded && queuedJobs.length > 0 && (
                <span className="queue-panel-badge">{queuedJobs.length}</span>
              )}
            </button>
            
            <div className="queue-panel-body">
              {queuedJobs.length === 0 ? (
                <div className="queue-empty">
                  <div className="queue-empty-icon">📋</div>
                  <div className="queue-empty-text">No jobs in queue</div>
                </div>
              ) : (
                <ul className="queue-list">
                  {queuedJobs.map((job) => (
                    <li key={job.id} className="queue-item">
                      <div className="queue-priority">{getPriorityIcon(job.priority)}</div>
                      <div className="queue-info">
                        <span className="queue-worker">{formatWorkerName(job.workerName)}</span>
                        <span className="queue-time">{formatRelativeTime(job.createdAt)}</span>
                      </div>
                      <button
                        className="queue-cancel-btn"
                        onClick={() => cancelJob(job.id)}
                        title="Cancel job"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

