
# Backend Documentation

## Tech Stack
- Node 20+
- TypeScript (ES Modules)
- Fastify HTTP server
- WebSocket broadcasting
- Event bus internal pub/sub
- tsx for development (replaces ts-node-dev)

## Directory Structure
```
backend/
  src/
    server.ts
    api/
      chat.ts
      jobs.ts
      memory.ts
    events/
      eventBus.ts
    models/
      jobStore.ts
      memoryStore.ts
    persona/
      personaService.ts
```

## Key Files

### `server.ts`
- Bootstraps Fastify
- Registers WebSocket endpoint `/ws`
- Relays event bus events (`message_created`, `job_updated`, `memory_updated`) to all connected WS clients
- Registers all API routes (chat, jobs, memory)
- Starts HTTP server on port 3001

### `api/chat.ts`
Handles:
- `POST /api/chat` – Process user messages
- Calls persona service
- Emits `message_created` event

### `api/jobs.ts`
Handles:
- `GET /api/jobs` – List all background jobs
- Returns job list from jobStore

### `api/memory.ts`
Handles:
- `GET /api/memory/:userId` – Get memories for a user
- Returns memory list from memoryStore

### `models/jobStore.ts`
In-memory job storage:
- `createDemoJob()` – Create a new job
- `updateJobStatus()` – Update job status
- `listJobs()` – Get all jobs

### `models/memoryStore.ts`
In-memory memory storage:
- `addMemoryForUser()` – Add a memory for a user
- `listMemoriesForUser()` – Get all memories for a user

### `events/eventBus.ts`
Minimal pub/sub:
- `on(type, handler)` – Subscribe to events
- `emit(event)` – Emit events
- Supports event types: `message_created`, `job_updated`, `memory_updated`

### `personaService.ts`
Stub persona:
- Echoes user message
- Generates assistant message object
