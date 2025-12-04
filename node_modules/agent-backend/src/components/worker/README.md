# Worker System – How You (the Agent) Should Use It

This project defines a **Worker** abstraction for background tasks that can be executed by the worker engine. Workers take jobs from a queue and process them.

## Core concepts

### Worker

All workers extend the abstract `AbstractWorker` class:

- `name` – unique identifier
- `description` – human-readable description
- `category` – worker category (memory, tool, think, etc.)
- `processJob(job)` – processes a job from the queue
- `run(args, ctx)` – implements the actual work (protected method)

Workers are different from Tools - they are long-running background tasks that are triggered by the scheduler or worker engine, not directly by the persona.

### Worker Engine

The `WorkerEngine` manages worker registration, job queuing, and job processing:

- `registerWorker(worker)` – register a worker
- `enqueue(workerName, args, ctx)` – enqueue a job for a worker
- `listWorkers()` – list all registered workers
- `listJobs()` – list all jobs

The engine processes jobs asynchronously. Later, this can be replaced with a Redis-based queue or similar.

### Worker Job

A job consists of:

- `id` – unique job identifier
- `workerName` – name of the worker that should process this job
- `status` – "queued" | "running" | "completed" | "failed"
- `createdAt`, `updatedAt` – timestamps
- `args` – job arguments
- `ctx` – tool context (userId, conversationId, source, etc.)
- `error` – optional error message if the job failed

### Scheduler Tool

The `SchedulerTool` is a Tool that:

- triggers workers, especially memory-related workers
- is the central way to schedule background work from the persona

For now, it supports at least:

```json
{
  "kind": "memory_compaction",
  "userId": "<optional override>",
  "conversationId": "<optional override>",
  "title": "<optional>",
  "content": "<optional>"
}
```

When called with `"kind": "memory_compaction"`, it will:

1. enqueue a job for the `memory_compaction_worker` via `workerEngine.enqueue`,
2. return `{ ok: true, data: { scheduled: true, jobId, workerName } }`.

Later, this tool can be extended to:

- create recurring schedules,
- write schedule definitions to Postgres/Redis,
- emit events for a dedicated scheduler service.

### Worker Manager Tool

The `WorkerManagerTool` is a Tool that:

- knows which workers exist
- can list workers and jobs

You can call it (via the tool system) with:

- `{ "action": "list_workers" }`
- `{ "action": "list_jobs" }`

and it will return structured information about the worker environment.

## How you (the persona) should behave

- When you detect that memory clean-up or summarisation should happen in the background, you should **call the `scheduler` tool** with `"kind": "memory_compaction"`.
- You should **not** call the worker directly in most cases; use the scheduler.
- To inspect the current worker environment (e.g. for transparency to the user), you can call the `worker_manager` tool with:
  - `{"action": "list_workers"}` to show what workers you have,
  - `{"action": "list_jobs"}` to see recent jobs and their status.

The actual details of job execution (in-process vs queue, retry behaviour, etc.) are handled by the worker engine and are not your concern at the persona level.

