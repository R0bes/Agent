import React, { useEffect, useRef, useState } from "react";
import { emit } from "../eventBus";
import { useWebSocket } from "../contexts/WebSocketContext";
import { IconButton } from "./IconButton";
import { SendIcon } from "./Icons";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const { status, ws } = useWebSocket();
  const listRef = useRef<HTMLDivElement | null>(null);
  const conversationId = "main";
  const userId = "user-123";

  // Listen to WebSocket messages from context
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "connection_established") {
          return;
        }
        
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

    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws]);

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
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          rows={1}
          placeholder="Type your message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                handleSubmit(e);
              }
            }
          }}
        />
        <IconButton
          icon={<SendIcon />}
          onClick={() => {
            if (text.trim()) {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
              handleSubmit(fakeEvent);
            }
          }}
          disabled={!text.trim()}
          variant="accent"
          title="Send message"
        />
      </form>
    </div>
  );
};
