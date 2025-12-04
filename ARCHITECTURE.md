
# Agent Prototype – Architecture Documentation

## Overview
This system is a full TypeScript-based AI agent architecture featuring:
- Backend: Fastify + TypeScript
- Frontend: React + Vite
- WebSocket event stream
- Persona stub (future AI orchestration)
- Event bus for internal async communication
- Extensible worker model for memory/tool/think tasks

## High-Level Components
### Persona
The persona centralizes:
- Message interpretation
- Conversation context management
- Delegation to memory/tool/think workers
- Event emission (e.g., `message_created`)

### Event Bus
The event bus decouples:
- Persona
- Chat API
- Worker engines
- WebSocket broadcasting

### Backend
- Hosts REST endpoints
- Handles persona-processing
- Emits events via event bus
- Forwards events to WebSocket clients

### Frontend
- SPA (React) providing:
  - Chat window with message history
  - Background job panel (functional) – shows job status
  - Memory panel (functional) – shows user memories
- Receives live updates via WebSocket
- Frontend event bus for component decoupling

## Data Flow

### Message Flow
1. User submits message via `POST /api/chat`
2. Backend → Persona handles message → generates reply
3. Persona emits event `message_created`
4. Event bus forwards to WebSocket broadcaster
5. Frontend WebSocket receives event → forwards to frontend event bus
6. Frontend event bus notifies subscribers (ChatView)
7. UI displays message

### Job Flow
1. Backend creates/updates job in jobStore
2. Backend emits `job_updated` event with job list
3. Event bus forwards to WebSocket
4. Frontend event bus notifies JobsPanel
5. UI updates job list

### Memory Flow
1. Backend adds memory to memoryStore
2. Backend emits `memory_updated` event with memory list
3. Event bus forwards to WebSocket
4. Frontend event bus notifies MemoryPanel
5. UI updates memory list
