
# Frontend Documentation

## Tech Stack
- React + TypeScript
- Vite bundler
- Simple CSS (custom, no framework)
- WebSocket event listener

## Directory Structure
```
frontend/
  src/
    main.tsx
    App.tsx
    eventBus.ts
    components/
      ChatView.tsx
      JobsPanel.tsx
      MemoryPanel.tsx
    styles.css
  index.html
  vite.config.ts
```

## Key Functionality

### React Structure
- `<App />` wraps interface layout with sidebar, main chat, and right panel
- `<ChatView />` handles:
  - Rendering messages
  - Submitting chat inputs
  - WebSocket connectivity with exponential backoff reconnection
  - Auto-scroll
  - Event bus integration
- `<JobsPanel />` displays background jobs:
  - Fetches jobs from `/api/jobs`
  - Subscribes to `job_updated` events
  - Shows job status badges (queued, running, done, failed)
- `<MemoryPanel />` displays user memories:
  - Fetches memories from `/api/memory/:userId`
  - Subscribes to `memory_updated` events
  - Shows memory items with kind tags (fact, preference, summary)

### WebSocket Client
Connects to:
```
/ws
```
Listens for multiple event types:
- `message_created` – New assistant messages
- `job_updated` – Background job status changes
- `memory_updated` – Memory updates

All events are forwarded to the frontend event bus (`eventBus.ts`) for component subscriptions.

### Frontend Event Bus
`eventBus.ts` provides:
- `subscribe(handler)` – Subscribe to events
- `emit(event)` – Emit events (used by WebSocket handler)
- Decouples WebSocket from React components

### Chat Submission Flow
1. User input triggers fetch:
   ```
   POST /api/chat
   ```
2. Backend processes + emits `message_created` event
3. WebSocket receives event → forwards to event bus
4. Event bus notifies subscribers (ChatView, etc.)
5. UI updates with assistant message

### Jobs Flow
1. Backend creates/updates job → emits `job_updated` event
2. WebSocket forwards to event bus
3. JobsPanel subscribes → updates job list

### Memory Flow
1. Backend adds/updates memory → emits `memory_updated` event
2. WebSocket forwards to event bus
3. MemoryPanel subscribes → updates memory list

