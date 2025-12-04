import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";

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

export const JobsPanel: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
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
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <span>Background jobs</span>
        <span className="panel-count">{jobs.length}</span>
      </div>
      <div className="panel-body">
        {jobs.length === 0 ? (
          <div className="muted">No jobs yet. Send a message to spawn a demo job.</div>
        ) : (
          <ul className="panel-list">
            {jobs.map((job) => (
              <li key={job.id} className="panel-item">
                <div className="panel-item-title">{job.label}</div>
                <div className="panel-item-meta">
                  <span className={`badge badge-${job.status}`}>{job.status}</span>
                  <span className="panel-item-type">{job.type}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

