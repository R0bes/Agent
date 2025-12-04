# Infra: Databases & Event Transport (Postgres, Redis, Qdrant, NATS)

This repository includes a `docker-compose.yml` that defines four core
infrastructure services for the agent:

- **Postgres** – structured memory (facts, preferences, conversation metadata)
- **Redis** – queues / ephemeral state (jobs, worker coordination)
- **Qdrant** – vector store for semantic memory and retrieval
- **NATS** – event transport (pub/sub, optionally with persistence via JetStream)

## How you (the agent / bots) should think about this

You should conceptually treat these services as *implementation details* behind
clean abstractions:

- Postgres will likely back a `MemoryStore` that persists your long-term memory.
- Redis is the natural backend for job queues and transient coordination.
- Qdrant is the backend for a future vector store used for semantic retrieval.
- NATS is the eventual backend for a distributed EventBus.

At the current stage of this prototype:

- Memory uses an **in-memory implementation** of `MemoryStore`.
- Events are still handled inside the backend process.
- Postgres/Redis/Qdrant/NATS are prepared, but not yet wired into the code.

You should:

- use `MemoryStore` (in `backend/src/memory`) as your interface to long-term memory,
- use the EventBus abstraction (in `backend/src/events`) to publish/subscribe
  domain events,
- not talk directly to Postgres/Redis/Qdrant/NATS from persona logic.

