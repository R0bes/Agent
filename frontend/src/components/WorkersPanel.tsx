import React, { useEffect, useState, useMemo } from "react";
import { subscribe } from "../eventBus";
import { IconButton } from "./IconButton";
import { WorkersIcon, PriorityHighIcon, PriorityNormalIcon, PriorityLowIcon } from "./Icons";

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

interface Job {
  id: string;
  workerName: string;
  category: string;
  type: "memory" | "tool" | "think";
  label: string;
  status: "queued" | "running" | "done" | "failed";
  createdAt: string;
  updatedAt: string;
  error?: string;
}

interface WorkersPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const WorkersPanel: React.FC<WorkersPanelProps> = ({ isOpen, onToggle }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [jobsViewExpanded, setJobsViewExpanded] = useState(false);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
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

  // Close jobs view when clicking outside
  useEffect(() => {
    if (!jobsViewExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const jobsPanel = target.closest('.jobs-view-panel');
      if (!jobsPanel) {
        setJobsViewExpanded(false);
      }
    };

    // Delay adding the listener to avoid immediate trigger from the open click
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [jobsViewExpanded]);

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

    fetchJobs();

    // Subscribe to updates
    const unsubscribe = subscribe((event) => {
      if (event.type === "worker_updated" && event.payload?.workers) {
        setWorkers(event.payload.workers as Worker[]);
      }
      if (event.type === "job_updated") {
        // Reload jobs when jobs update
        fetchJobs();
      }
    });

    return unsubscribe;
  }, []);

  const fetchJobs = () => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      })
      .catch((err) => console.error("Failed to load jobs", err));
  };

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
    if (expandedWorker === workerName) {
      setExpandedWorker(null);
      setSelectedWorkerFilter(null);
    } else {
      setExpandedWorker(workerName);
      setSelectedWorkerFilter(workerName);
      setJobsViewExpanded(true);
    }
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
        fetchJobs();
      }
    } catch (err) {
      console.error("Failed to cancel job", err);
    }
  };

  // Filter jobs based on selected filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedWorkerFilter && job.workerName !== selectedWorkerFilter) {
        return false;
      }
      if (categoryFilter && job.category !== categoryFilter) {
        return false;
      }
      if (statusFilter && job.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [jobs, selectedWorkerFilter, categoryFilter, statusFilter]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(jobs.map(j => j.category))).sort();
  }, [jobs]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(jobs.map(j => j.status))).sort();
  }, [jobs]);

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
                          </button>
                        </div>
                        
                        {isExpanded && (
                          <div className="worker-card-body">
                            <div className="worker-detail-description">
                              {worker.description}
                            </div>
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
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Jobs View Panel - Slides up from bottom */}
          <div className={`jobs-view-panel ${jobsViewExpanded ? 'jobs-view-panel-expanded' : ''}`}>
            {/* Morphing Button/Header */}
            <button 
              className={`jobs-view-panel-morph ${jobsViewExpanded ? 'jobs-view-panel-morph-expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setJobsViewExpanded(!jobsViewExpanded);
              }}
              title={jobsViewExpanded ? "Click to close" : "Show Jobs"}
            >
              <div className="jobs-view-panel-morph-content">
                <span>📋</span>
                <span className="jobs-view-panel-morph-title">Jobs</span>
                <span className="jobs-view-panel-morph-count">{jobs.length}</span>
              </div>
              {!jobsViewExpanded && jobs.length > 0 && (
                <span className="jobs-view-panel-badge">{jobs.length}</span>
              )}
            </button>
            
            <div className="jobs-view-panel-body">
              {/* Filters */}
              <div className="jobs-view-filters">
                <div className="jobs-view-filter-group">
                  <label htmlFor="worker-filter">Worker:</label>
                  <select 
                    id="worker-filter"
                    className="jobs-view-filter-select"
                    title="Filter by worker"
                    value={selectedWorkerFilter || ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setSelectedWorkerFilter(value);
                      if (value) {
                        setExpandedWorker(value);
                      } else {
                        setExpandedWorker(null);
                      }
                    }}
                  >
                    <option value="">All Workers</option>
                    {workers.map((w) => (
                      <option key={w.name} value={w.name}>{formatWorkerName(w.name)}</option>
                    ))}
                  </select>
                </div>
                <div className="jobs-view-filter-group">
                  <label htmlFor="category-filter">Category:</label>
                  <select 
                    id="category-filter"
                    className="jobs-view-filter-select"
                    title="Filter by category"
                    value={categoryFilter || ""}
                    onChange={(e) => setCategoryFilter(e.target.value || null)}
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="jobs-view-filter-group">
                  <label htmlFor="status-filter">Status:</label>
                  <select 
                    id="status-filter"
                    className="jobs-view-filter-select"
                    title="Filter by status"
                    value={statusFilter || ""}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                {(selectedWorkerFilter || categoryFilter || statusFilter) && (
                  <button
                    className="jobs-view-filter-clear"
                    onClick={() => {
                      setSelectedWorkerFilter(null);
                      setCategoryFilter(null);
                      setStatusFilter(null);
                      setExpandedWorker(null);
                    }}
                    title="Clear filters"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Jobs List */}
              {filteredJobs.length === 0 ? (
                <div className="jobs-view-empty">
                  <div className="jobs-view-empty-icon">📋</div>
                  <div className="jobs-view-empty-text">No jobs found</div>
                </div>
              ) : (
                <ul className="jobs-view-list">
                  {filteredJobs.map((job) => (
                    <li key={job.id} className={`jobs-view-item jobs-view-item-${job.status}`}>
                      <div className="jobs-view-item-icon">{getCategoryIcon(job.category)}</div>
                      <div className="jobs-view-item-info">
                        <div className="jobs-view-item-header">
                          <span className="jobs-view-item-worker">{formatWorkerName(job.workerName)}</span>
                          <span className={`badge badge-${job.status}`}>{job.status}</span>
                        </div>
                        <div className="jobs-view-item-meta">
                          <span className="jobs-view-item-time">{formatRelativeTime(job.createdAt)}</span>
                          {job.error && (
                            <span className="jobs-view-item-error" title={job.error}>⚠️ Error</span>
                          )}
                        </div>
                      </div>
                      {job.status === "queued" && (
                        <button
                          className="jobs-view-item-cancel"
                          onClick={() => cancelJob(job.id)}
                          title="Cancel job"
                        >
                          ×
                        </button>
                      )}
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

