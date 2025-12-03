
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
  - Chat window
  - Background job panel (stub)
  - Memory panel (stub)
- Receives live updates via WebSocket

## Data Flow
1. User submits message via `POST /api/chat`
2. Backend → Persona handles message → generates reply
3. Persona emits event `message_created`
4. Event bus forwards to WebSocket broadcaster
5. Frontend receives event → displays message
