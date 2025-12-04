const jobs = [];
export function createDemoJob(label, type = "tool") {
    const now = new Date().toISOString();
    const job = {
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
export function updateJobStatus(id, status) {
    const job = jobs.find((j) => j.id === id);
    if (!job)
        return undefined;
    job.status = status;
    job.updatedAt = new Date().toISOString();
    return job;
}
export function listJobs() {
    return [...jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
