
# Backend Documentation

## Tech Stack
- Node 20+
- TypeScript
- Fastify HTTP server
- WebSocket broadcasting
- Event bus internal pub/sub

## Directory Structure
```
backend/
  src/
    server.ts
    api/chat.ts
    events/eventBus.ts
    persona/personaService.ts
```

## Key Files

### `server.ts`
- Bootstraps Fastify
- Registers WebSocket endpoint `/ws`
- Relays event bus events to all connected WS clients
- Starts HTTP server on port 3001

### `api/chat.ts`
Handles:
- `POST /api/chat`
- Calls persona
- Emits `message_created` event

### `eventBus.ts`
Minimal pub/sub:
- `on(type, handler)`
- `emit(event)`

### `personaService.ts`
Stub persona:
- Echoes user message
- Generates assistant message object
