# Memory Subsystem – How You (the Agent) Should Use This

You have access to a **MemoryStore** abstraction that represents your long-term
memory. It is designed to be independent from the underlying storage
implementation (in-memory now, later Postgres + Qdrant).

## Concepts

Memory items have:

- `kind` – "fact", "preference", "summary" or "episode"
- `userId` – who this memory belongs to
- `title` – short label
- `content` – the text you want to remember
- optional `tags` – for retrieval by topic
- optional `conversationId` – link to the chat thread

## How you should use MemoryStore

You interact with memory via:

- `add({ userId, kind, title, content, tags?, conversationId? })`
- `list({ userId?, kinds?, tags?, conversationId?, limit? })`

### When to WRITE

Write memory when:

- the user reveals stable facts or preferences,
- a long conversation reaches a stable conclusion,
- an "episode" (e.g. incident, architecture discussion) should be remembered.

### When to READ

Read memory before answering when:

- a conversation resumes after a pause,
- recurring topics appear,
- preferences/decisions from earlier should be respected.

Typically a context builder will:

1. Load recent messages.
2. Call `MemoryStore.list` for relevant memories.
3. Condense them into context for the model.

Currently, `MemoryStore` is implemented as `InMemoryMemoryStore`, which does not
survive process restarts. Later, it can be replaced with Postgres/Qdrant-backed
implementations without changing your persona/business logic.

