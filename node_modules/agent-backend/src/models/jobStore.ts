export type JobStatus = "queued" | "running" | "done" | "failed";
export type JobType = "memory" | "tool" | "think";

export interface Job {
  id: string;
  type: JobType;
  label: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

const jobs: Job[] = [];

export function createDemoJob(label: string, type: JobType = "tool"): Job {
  const now = new Date().toISOString();
  const job: Job = {
    id: `job-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    label,
    status: "queued",
    createdAt: now,
    updatedAt: now
  };
  jobs.push(job);
  return job;
}

export function updateJobStatus(id: string, status: JobStatus): Job | undefined {
  const job = jobs.find((j) => j.id === id);
  if (!job) return undefined;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  return job;
}

export function listJobs(): Job[] {
  return [...jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

