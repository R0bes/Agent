# Event System – How You (the Agent) Should Think About It

There is an **event bus** abstraction in this project. It is used
to notify different parts of the system when something relevant has happened.

Examples of domain events:

- `message_created` – a user or assistant message was created
- `job_updated` – a background job changed its status
- `memory_updated` – long-term memory items were added/changed

As the persona/orchestrator you should conceptually think of events as:

- facts about the world that have been emitted,
- triggers for other subsystems (workers, memory updaters, UI),
- not something you micro-manage at transport level.

The transport (in-process vs NATS vs something else) is an implementation detail.

You should:

- publish domain events whenever something important happens
  (new message, job state changes, memory writes),
- subscribe to events only in dedicated components
  (e.g. worker engines, web socket broadcaster, memory compaction workers),
- NOT rely on any specific event bus implementation.

Right now, the implementation is an **in-memory event bus** inside the backend.
In the future, it can be replaced with a NATS-backed event bus without changing
your core logic.

