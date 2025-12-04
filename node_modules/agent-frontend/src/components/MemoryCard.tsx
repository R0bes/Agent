import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";
import { IconButton } from "./IconButton";
import { MemoryIcon } from "./Icons";

type MemoryKind = "fact" | "preference" | "summary" | "episode";

interface MemoryItem {
  id: string;
  userId: string;
  kind: MemoryKind;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
  conversationId?: string;
}

const DEMO_USER_ID = "user-123";

export const MemoryCard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  return (
    <>
      <div className={`panel-card-overlay ${isOpen ? "panel-card-overlay-open" : ""}`} onClick={onClose} />
      <div className={`panel-card panel-card-memory ${isOpen ? "panel-card-open" : ""}`}>
        <div className="panel-card-inner">
          <div className="panel-card-front">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <MemoryIcon />
                <span>Memory</span>
                <span className="panel-card-count">{memories.length}</span>
              </div>
              <IconButton
                icon={<span>×</span>}
                onClick={onClose}
                title="Close"
                variant="ghost"
                size="sm"
              />
            </div>
            <div className="panel-card-body">
              {memories.length === 0 ? (
                <div className="panel-card-empty">
                  <div className="panel-card-empty-icon">🧠</div>
                  <div className="panel-card-empty-text">No memories yet. Send a few messages to create them.</div>
                </div>
              ) : (
                <ul className="panel-card-list">
                  {memories.map((m) => (
                    <li key={m.id} className="panel-card-item">
                      <div className="panel-card-item-title">
                        {m.title} <span className="tag">{m.kind}</span>
                      </div>
                      <div className="panel-card-item-content">{m.content}</div>
                      {m.tags && m.tags.length > 0 && (
                        <div className="panel-card-item-tags">
                          {m.tags.map((tag, idx) => (
                            <span key={idx} className="tag-small">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="panel-card-back">
            <div className="panel-card-back-content">
              <div className="panel-card-back-icon">💭</div>
              <div className="panel-card-back-text">Remembering...</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

