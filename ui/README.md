# ⚛️ React Frontend - Moderne Chat-UI mit Streaming-Support

Das Frontend des Agent-Systems ist eine moderne React 18+ Anwendung mit TypeScript, die WebSocket-Integration und Streaming-UI für eine optimale Benutzererfahrung bietet.

## 🏗️ Architektur-Übersicht

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   App       │───▶│  ChatWindow  │───▶│ WebSocket   │───▶│   Server    │
│ (Root)      │    │ (Container)  │    │ Manager     │    │ (Backend)   │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Routing     │    │ Message      │    │ Connection  │
│ (geplant)   │    │ List         │    │ Status      │
└─────────────┘    └──────────────┘    └─────────────┘
```

## 📁 Projektstruktur

```
ui/
├── README.md                 # Diese Datei
├── package.json              # Node.js-Dependencies & Scripts
├── vite.config.ts            # Vite-Build-Konfiguration
├── tsconfig.json             # TypeScript-Konfiguration
├── index.html                # HTML-Entrypoint
├── public/                   # Statische Assets
│   ├── favicon.ico          # Favicon
│   └── robots.txt           # SEO-Robots
└── src/                      # React-Quellcode
    ├── main.tsx              # React-Entrypoint
    ├── App.tsx               # Haupt-App-Komponente
    ├── index.css             # Globale Styles
    ├── config/               # Konfiguration
    │   └── index.ts          # WebSocket-URL & Einstellungen
    ├── components/           # React-Komponenten
    │   ├── ChatWindow.tsx    # Haupt-Chat-Container
    │   ├── MessageList.tsx   # Nachrichtenverlauf
    │   ├── MessageInput.tsx  # Eingabefeld
    │   ├── OnlineIndicator.tsx # Verbindungsstatus
    │   ├── WebSocketManager.tsx # WebSocket-Logik
    │   └── index.ts          # Komponenten-Exporte
    ├── types/                # TypeScript-Typen
    │   ├── chat.ts           # Chat-spezifische Typen
    │   └── websocket.ts      # WebSocket-Typen
    ├── hooks/                # Custom React-Hooks
    │   ├── useWebSocket.ts   # WebSocket-Hook
    │   └── useChat.ts        # Chat-Logik-Hook
    ├── utils/                # Hilfsfunktionen
    │   ├── formatters.ts     # Datum/Zeit-Formatierung
    │   └── validators.ts     # Eingabevalidierung
    └── styles/               # CSS-Module
        ├── ChatWindow.css    # Chat-Container-Styles
        ├── MessageList.css   # Nachrichtenliste-Styles
        └── components.css    # Gemeinsame Komponenten-Styles
```

## 🔧 Kernkomponenten

### **1. App.tsx - Hauptanwendung**
```tsx
import React from 'react';
import { ChatWindow } from './components/ChatWindow';
import './index.css';

function App() {
  return (
    <div className="App">
      <ChatWindow />
    </div>
  );
}

export default App;
```

**Verantwortlichkeiten:**
- App-Root-Komponente
- Routing (geplant)
- Global State Management (geplant)
- Theme-Provider (geplant)

### **2. ChatWindow.tsx - Chat-Container**
```tsx
export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  
  const handleSendMessage = useCallback((content: string) => {
    const messageType = useStreaming ? 'stream_request' : 'message';
    (window as any).sendMessage({
      type: messageType,
      content: content
    });
  }, [useStreaming]);
  
  return (
    <div className="chat-window">
      {/* Chat-Header mit Streaming-Toggle */}
      {/* Message-List */}
      {/* Message-Input */}
      {/* WebSocket-Manager */}
    </div>
  );
};
```

**Verantwortlichkeiten:**
- Chat-State-Management
- Streaming-Toggle-Funktionalität
- Komponenten-Koordination
- Nachrichtenverarbeitung

### **3. WebSocketManager.tsx - WebSocket-Logik**
```tsx
export const WebSocketManager: React.FC<WebSocketManagerProps> = ({
  onMessage,
  onStatusChange,
  url = 'ws://localhost:9797/ws/client1'
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  
  const sendMessage = useCallback((messageData: string | { type: string; content: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof messageData === 'string' 
        ? { type: 'message', content: messageData }
        : { ...messageData, timestamp: new Date().toISOString() };
      
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // WebSocket-Lifecycle-Management...
};
```

**Verantwortlichkeiten:**
- WebSocket-Verbindungsverwaltung
- Nachrichten-Serialisierung
- Reconnection-Logik
- Error-Handling

### **4. MessageList.tsx - Nachrichtenverlauf**
```tsx
export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.sender} ${message.isStreaming ? 'streaming' : ''}`}
        >
          <div className="message-content">
            <div className="message-text">
              {message.content}
              {message.isStreaming && <span className="streaming-cursor">|</span>}
            </div>
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
              {message.isStreaming && <span className="streaming-indicator">●</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

**Verantwortlichkeiten:**
- Nachrichten-Rendering
- Streaming-UI-Indikatoren
- Auto-Scroll-Funktionalität
- Responsive Layout

## 🔄 Streaming-UI-Implementation

### **Streaming-Nachrichtenverarbeitung**
```tsx
const handleNewMessage = useCallback((message: ChatMessage) => {
  setMessages(prev => {
    switch (message.type) {
      case 'streaming_start':
        // Neue Streaming-Nachricht hinzufügen
        return [...prev, message];
        
      case 'streaming_token':
        // Bestehende Nachricht erweitern
        return prev.map(msg => 
          msg.streamId === message.streamId 
            ? { ...msg, content: msg.content + message.content }
            : msg
        );
        
      case 'streaming_end':
        // Streaming beenden, Inhalt beibehalten
        return prev.map(msg => 
          msg.streamId === message.streamId 
            ? { ...msg, isStreaming: false, type: 'response' }
            : msg
        );
        
      default:
        // Normale Nachricht hinzufügen
        return [...prev, message];
    }
  });
}, []);
```

### **Streaming-UI-Indikatoren**
```tsx
// Streaming-Cursor (blinkender Strich)
<span className="streaming-cursor">|</span>

// Streaming-Indikator (pulsierender Punkt)
<span className="streaming-indicator">●</span>

// Streaming-Nachrichten-Styling
.message.streaming .message-content {
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 123, 255, 0.2);
}
```

## 📡 WebSocket-Protokoll

### **Nachrichtenformat**
```typescript
interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'core';
  type: 'message' | 'response' | 'streaming_start' | 'streaming_token' | 'streaming_end';
  isStreaming?: boolean;
  streamId?: string;
}
```

### **Client → Server**
```json
// Normale Nachricht
{
  "type": "message",
  "content": "Hallo, wie geht es dir?",
  "timestamp": "2025-08-15T10:00:00.000Z"
}

// Streaming-Anfrage
{
  "type": "stream_request",
  "content": "Erzähle mir eine Geschichte",
  "timestamp": "2025-08-15T10:00:00.000Z"
}
```

### **Server → Client**
```json
// Streaming-Start
{
  "type": "streaming_start",
  "streamId": "stream_123",
  "timestamp": "2025-08-15T10:00:00.000Z"
}

// Streaming-Token
{
  "type": "streaming_token",
  "streamId": "stream_123",
  "content": "E",
  "timestamp": "2025-08-15T10:00:00.000Z"
}

// Streaming-Ende
{
  "type": "streaming_end",
  "streamId": "stream_123",
  "timestamp": "2025-08-15T10:00:00.000Z"
}
```

## 🎨 UI/UX-Features

### **Responsive Design**
```css
/* Mobile-First Approach */
@media (max-width: 768px) {
  .chat-window {
    height: 100vh;
    border-radius: 0;
  }
  
  .message {
    max-width: 90%;
  }
}

@media (max-width: 480px) {
  .message {
    max-width: 95%;
  }
}
```

### **Streaming-Animationen**
```css
/* Blinkender Cursor */
.streaming-cursor {
  animation: blink 1s infinite;
  color: #007bff;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Pulsierender Indikator */
.streaming-indicator {
  animation: pulse 2s infinite;
  color: #007bff;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### **Moderne UI-Elemente**
- **Glassmorphism-Effekte** mit `backdrop-filter: blur()`
- **Gradient-Hintergründe** für visuelle Tiefe
- **Smooth Transitions** für alle Interaktionen
- **Hover-Effekte** für bessere UX

## 🚀 Entwicklung

### **Installation**
```bash
cd ui
npm install
```

### **Development-Server**
```bash
npm run dev
# Läuft auf http://localhost:5173
```

### **Build für Produktion**
```bash
npm run build
# Output in dist/ Verzeichnis
```

### **Code-Qualität**
```bash
# Linting
npm run lint

# Type-Checking
npm run type-check

# Tests (falls konfiguriert)
npm test
```

## 🧪 Testing

### **Komponenten-Tests**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWindow } from './ChatWindow';

test('ChatWindow rendert korrekt', () => {
  render(<ChatWindow />);
  expect(screen.getByText('Core Service Chat')).toBeInTheDocument();
});

test('Streaming-Toggle funktioniert', () => {
  render(<ChatWindow />);
  const toggle = screen.getByRole('checkbox');
  fireEvent.click(toggle);
  expect(toggle).toBeChecked();
});
```

### **WebSocket-Tests**
```tsx
import { WebSocketManager } from './WebSocketManager';

test('WebSocket sendet Nachrichten korrekt', () => {
  const mockWebSocket = new MockWebSocket();
  const onMessage = jest.fn();
  
  render(<WebSocketManager onMessage={onMessage} />);
  
  // Nachricht senden
  fireEvent.click(sendButton);
  
  expect(mockWebSocket.send).toHaveBeenCalledWith(
    JSON.stringify({
      type: 'message',
      content: 'Test',
      timestamp: expect.any(String)
    })
  );
});
```

## 🔍 Debugging

### **React DevTools**
- **Components Tab**: Komponenten-Hierarchie und Props
- **Profiler Tab**: Performance-Analyse
- **Console Tab**: JavaScript-Logs

### **WebSocket-Debugging**
```typescript
// WebSocket-Logs aktivieren
const ws = new WebSocket(url);
ws.onopen = () => console.log('WebSocket verbunden');
ws.onmessage = (event) => console.log('Nachricht empfangen:', event.data);
ws.onerror = (error) => console.error('WebSocket-Fehler:', error);
ws.onclose = (event) => console.log('WebSocket geschlossen:', event.code);
```

### **State-Debugging**
```tsx
// State-Änderungen loggen
useEffect(() => {
  console.log('Messages aktualisiert:', messages);
}, [messages]);

useEffect(() => {
  console.log('Connection Status:', connectionStatus);
}, [connectionStatus]);
```

## 🚀 Performance-Optimierungen

### **React-Optimierungen**
```tsx
// Memoization für teure Berechnungen
const memoizedMessages = useMemo(() => 
  messages.filter(msg => msg.sender === 'core'), 
  [messages]
);

// Callback-Memoization
const handleSendMessage = useCallback((content: string) => {
  // Nachrichtenlogik...
}, [useStreaming]);

// Komponenten-Memoization
export const MessageItem = React.memo(({ message }: MessageItemProps) => {
  return <div className="message">{message.content}</div>;
});
```

### **WebSocket-Optimierungen**
```typescript
// Reconnection-Logik mit Exponential Backoff
const reconnectDelay = Math.min(1000 * Math.pow(2, attempts), 10000);

// Message-Buffering für hohe Nachrichtenraten
const messageBuffer: ChatMessage[] = [];
const flushBuffer = () => {
  if (messageBuffer.length > 0) {
    setMessages(prev => [...prev, ...messageBuffer]);
    messageBuffer.length = 0;
  }
};
```

## 🔮 Erweiterungen

### **Neue Nachrichtentypen**
```typescript
interface TypingIndicator {
  type: 'typing_start' | 'typing_stop';
  userId: string;
  timestamp: string;
}

// In handleNewMessage hinzufügen
case 'typing_start':
  setTypingUsers(prev => [...prev, message.userId]);
  break;
```

### **Neue UI-Komponenten**
```tsx
// Typing-Indicator
const TypingIndicator: React.FC = () => (
  <div className="typing-indicator">
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="dot"></span>
  </div>
);

// File-Upload
const FileUpload: React.FC = () => (
  <input 
    type="file" 
    accept="image/*,.pdf,.doc,.txt"
    onChange={handleFileUpload}
  />
);
```

### **Theme-System**
```typescript
interface Theme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

const themes: Record<string, Theme> = {
  light: { /* ... */ },
  dark: { /* ... */ },
  cyberpunk: { /* ... */ }
};
```

## 📝 Best Practices

### **TypeScript**
```typescript
// Strenge Typisierung
interface MessageProps {
  message: ChatMessage;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
}

// Union Types für Nachrichtentypen
type MessageType = 'message' | 'stream_request' | 'ping' | 'status';

// Generic Types für wiederverwendbare Komponenten
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}
```

### **React Hooks**
```tsx
// Custom Hook für WebSocket-Logik
const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);
  
  // WebSocket-Logik hier...
  
  return { isConnected, lastMessage, sendMessage };
};

// Hook für Chat-Logik
const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Chat-Logik hier...
  
  return { messages, isTyping, sendMessage, clearChat };
};
```

### **Error Boundaries**
```tsx
class ChatErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat-Fehler:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <div className="error-fallback">Chat konnte nicht geladen werden</div>;
    }
    
    return this.props.children;
  }
}
```

## 🔧 Build & Deployment

### **Vite-Konfiguration**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:9797',
      '/ws': {
        target: 'ws://localhost:9797',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['date-fns', 'lodash']
        }
      }
    }
  }
});
```

### **Environment-Konfiguration**
```typescript
// config/index.ts
export const config = {
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:9797/ws/client1',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:9797',
  environment: import.meta.env.MODE || 'development'
};
```

---

**Entwickelt für moderne, responsive Chat-Interfaces mit Streaming-Support**
