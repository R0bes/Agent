# Agent Prototype (TypeScript Full-Stack Skeleton)

This is a minimal monorepo-style skeleton for your personal AI agent system.

- **Backend**: Node 20+, TypeScript (ES Modules), Fastify, WebSockets, tsx
- **Frontend**: Vite + React + TypeScript, simple CSS layout
- **Architecture**:
  - Persona core
  - Event bus (backend & frontend)
  - Chat API with WebSocket streaming
  - Jobs API for background tasks
  - Memory API for user context
  - Real-time UI updates via WebSocket

## Structure

- `backend/` – Fastify server, REST + WebSocket, persona stub, job & memory stores
- `frontend/` – Vite + React SPA with chat, jobs panel, and memory panel

## Quickstart

### Option 1: Setup Script (Recommended)

**Windows (PowerShell):**

```powershell
.\setup.ps1
```

**Linux/Mac:**

```bash
chmod +x setup.sh
./setup.sh
```

**npm (all platforms):**

```bash
npm run setup
```

### Option 2: Manual Setup

#### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Backend listens on `http://localhost:3001`.

#### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on `http://localhost:5174` and is configured
to proxy `/api` and `/ws` to the backend.

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** – System architecture overview
- **[BACKEND.md](./BACKEND.md)** – Backend implementation details
- **[FRONTEND.md](./FRONTEND.md)** – Frontend implementation details
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** – Development guide and best practices

## Deployment

For a simple single-bundle deployment you can later:

- run `npm run build` in `frontend`
- serve `frontend/dist` from the backend (e.g. via `@fastify/static`)
- remove the separate dev proxy.
