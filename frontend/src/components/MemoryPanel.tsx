import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";

type MemoryKind = "fact" | "preference" | "summary";

interface MemoryItem {
  id: string;
  userId: string;
  kind: MemoryKind;
  title: string;
  content: string;
  createdAt: string;
}

const DEMO_USER_ID = "user-123";

export const MemoryPanel: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  useEffect(() => {
    // initial load
    fetch(`/api/memory/${DEMO_USER_ID}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.memories)) {
          setMemories(data.memories);
        }
      })
      .catch((err) => console.error("Failed to load memories", err));

    const unsubscribe = subscribe((event) => {
      if (event.type === "memory_updated" && event.payload?.userId === DEMO_USER_ID) {
        if (Array.isArray(event.payload.memories)) {
          setMemories(event.payload.memories as MemoryItem[]);
        }
      }
    });

    return unsubscribe;
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <span>Memory</span>
        <span className="panel-count">{memories.length}</span>
      </div>
      <div className="panel-body">
        {memories.length === 0 ? (
          <div className="muted">No memories yet. Send a few messages to create them.</div>
        ) : (
          <ul className="panel-list">
            {memories.map((m) => (
              <li key={m.id} className="panel-item">
                <div className="panel-item-title">
                  {m.title} <span className="tag">{m.kind}</span>
                </div>
                <div className="panel-item-content">{m.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

