
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
    components/
      ChatView.tsx
    styles.css
  index.html
  vite.config.ts
```

## Key Functionality

### React Structure
- `<App />` wraps interface layout
- `<ChatView />` handles:
  - Rendering messages
  - Submitting chat inputs
  - WS connectivity
  - Auto-scroll

### WebSocket Client
Connects to:
```
/ws
```
Listens for:
```
{ type: "message_created", payload: {...} }
```

### Chat Submission Flow
1. User input triggers fetch:
   ```
   POST /api/chat
   ```
2. Backend processes + emits event
3. WebSocket updates UI with assistant message

