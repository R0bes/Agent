
# Development Guide

## Requirements
- Node 20+
- npm or pnpm

## Setup

### Backend
```
cd backend
npm install
npm run dev
```
Runs on http://localhost:3001

**Note:** Uses `tsx` for development (ES Module support). The dev script runs `tsx watch src/server.ts` which automatically restarts on file changes.

### Frontend
```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173  
Proxy forwards /api and /ws to backend.

## Build Frontend
```
npm run build
```
Outputs to `dist/` — can be embedded into backend later.

## Integrating Real Persona Logic
Replace `personaService.ts` with:
- LLM calls
- Tool delegation
- Memory vector lookups
- Worker queue triggers

## Adding Workers
Design pattern:
- Worker subscribes to event bus
- Emits progress events (`job_updated`)
- Frontend displays job activity

