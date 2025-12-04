import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";
import { IconButton } from "./IconButton";
import { JobsIcon } from "./Icons";

type JobStatus = "queued" | "running" | "done" | "failed";
type JobType = "memory" | "tool" | "think";

interface Job {
  id: string;
  type: JobType;
  label: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export const JobsCard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // initial load
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      })
      .catch((err) => console.error("Failed to load jobs", err));

    // subscribe to job_updated events
    const unsubscribe = subscribe((event) => {
      if (event.type === "job_updated" && event.payload?.jobs) {
        setJobs(event.payload.jobs as Job[]);
      }
    });
    return unsubscribe;
  }, [isOpen]);

  return (
    <>
      <div className={`panel-card-overlay ${isOpen ? "panel-card-overlay-open" : ""}`} onClick={onClose} />
      <div className={`panel-card panel-card-jobs ${isOpen ? "panel-card-open" : ""}`}>
        <div className="panel-card-inner">
          <div className="panel-card-front">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <JobsIcon />
                <span>Background Jobs</span>
                <span className="panel-card-count">{jobs.length}</span>
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
              {jobs.length === 0 ? (
                <div className="panel-card-empty">
                  <div className="panel-card-empty-icon">📋</div>
                  <div className="panel-card-empty-text">No jobs yet. Send a message to spawn a demo job.</div>
                </div>
              ) : (
                <ul className="panel-card-list">
                  {jobs.map((job) => (
                    <li key={job.id} className="panel-card-item">
                      <div className="panel-card-item-title">{job.label}</div>
                      <div className="panel-card-item-meta">
                        <span className={`badge badge-${job.status}`}>{job.status}</span>
                        <span className="panel-card-item-type">{job.type}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="panel-card-back">
            <div className="panel-card-back-content">
              <div className="panel-card-back-icon">⚙️</div>
              <div className="panel-card-back-text">Processing...</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

