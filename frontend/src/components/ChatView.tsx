import React, { useEffect, useRef, useState } from "react";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

const WS_URL =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.host +
  "/ws";

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">(
    "disconnected"
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const conversationId = "main";
  const userId = "user-123";

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connectWebSocket() {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
      const el = document.getElementById("persona-status");
      if (el) el.textContent = "Ready";
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message_created") {
          const m = data.payload as Message;
          setMessages((prev) => [...prev, m]);
          scrollToBottom();
          const el = document.getElementById("persona-status");
          if (el) el.textContent = "Ready";
        }
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    ws.onclose = (event) => {
      setStatus("disconnected");
      wsRef.current = null;
      
      // Only reconnect if it wasn't a manual close
      if (event.code !== 1000) {
        // Exponential backoff: 2s, 4s, 8s, max 30s
        const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      // Error will trigger onclose, so we don't need to close manually
    };
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const userMessage: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();
    setText("");

    const el = document.getElementById("persona-status");
    if (el) el.textContent = "Thinking…";

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userId,
          text: userMessage.content
        })
      });
    } catch (err) {
      console.error(err);
      if (el) el.textContent = "Error";
    }
  }

  return (
    <div className="chat">
      <div className="message-list" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "message " + (m.role === "user" ? "message-user" : "message-assistant")
            }
          >
            {m.content}
          </div>
        ))}
        {status !== "connected" && (
          <div className="system-info">WebSocket: {status}</div>
        )}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          rows={1}
          placeholder="Type your message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};
