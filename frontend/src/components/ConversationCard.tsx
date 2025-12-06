import React, { useEffect, useState } from "react";
import { subscribe } from "../eventBus";
import { IconButton } from "./IconButton";
import { ConversationIcon } from "./Icons";

interface ConversationMetadata {
  conversationId: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalChars: number;
  estimatedTokens: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
  recentMessages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    metadata?: any;
  }>;
}

interface ConversationCardProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONVERSATION_ID = "main";

export const ConversationCard: React.FC<ConversationCardProps> = ({ isOpen, onClose }) => {
  const [metadata, setMetadata] = useState<ConversationMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConversationData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/conversation/${CONVERSATION_ID}`);
      const data = await res.json();
      setMetadata(data);
    } catch (err) {
      console.error("Failed to load conversation data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversationData();
    }

    // Subscribe to message_created events to refresh
    const unsubscribe = subscribe((event) => {
      if (event.type === "message_created" && isOpen) {
        loadConversationData();
      }
    });

    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDuration = () => {
    if (!metadata?.firstMessageAt || !metadata?.lastMessageAt) return "N/A";
    const start = new Date(metadata.firstMessageAt).getTime();
    const end = new Date(metadata.lastMessageAt).getTime();
    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} Min`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <div className={`panel-card-overlay ${isOpen ? "panel-card-overlay-open" : ""}`} onClick={onClose} />
      <div className={`panel-card panel-card-conversation ${isOpen ? "panel-card-open" : ""}`}>
        <div className="panel-card-inner">
          <div className="panel-card-front">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <ConversationIcon />
                <span>Conversation Details</span>
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
        {loading ? (
          <div className="muted">Loading conversation data...</div>
        ) : metadata ? (
          <>
            {/* Statistics Section */}
            <section className="conversation-stats">
              <h3>Statistik</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Gesamt Messages</div>
                  <div className="stat-value">{metadata.messageCount}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">User Messages</div>
                  <div className="stat-value">{metadata.userMessageCount}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Assistant Messages</div>
                  <div className="stat-value">{metadata.assistantMessageCount}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Geschätzte Tokens</div>
                  <div className="stat-value">{metadata.estimatedTokens.toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Zeichen Gesamt</div>
                  <div className="stat-value">{metadata.totalChars.toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Dauer</div>
                  <div className="stat-value">{formatDuration()}</div>
                </div>
              </div>
            </section>

            {/* Timeline Section */}
            <section className="conversation-timeline">
              <h3>Timeline</h3>
              <div className="timeline-item">
                <span className="timeline-label">Erste Message:</span>
                <span className="timeline-value">{formatDate(metadata.firstMessageAt)}</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-label">Letzte Message:</span>
                <span className="timeline-value">{formatDate(metadata.lastMessageAt)}</span>
              </div>
            </section>

            {/* Recent Messages Section */}
            <section className="conversation-recent">
              <h3>Letzte Messages ({metadata.recentMessages.length})</h3>
              <div className="recent-messages-list">
                {metadata.recentMessages.map((msg) => (
                  <div key={msg.id} className={`recent-message recent-message-${msg.role}`}>
                    <div className="recent-message-header">
                      <span className="recent-message-role">{msg.role}</span>
                      <span className="recent-message-time">
                        {new Date(msg.createdAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <div className="recent-message-content">{msg.content}</div>
                    {msg.metadata?.processingDuration && (
                      <div className="recent-message-meta">
                        Processing: {msg.metadata.processingDuration}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Actions Section */}
            <section className="conversation-actions">
              <button 
                className="btn btn-secondary"
                onClick={loadConversationData}
              >
                🔄 Aktualisieren
              </button>
            </section>
          </>
        ) : (
          <div className="panel-card-empty">
            <div className="panel-card-empty-icon">💬</div>
            <div className="panel-card-empty-text">Keine Konversationsdaten verfügbar</div>
          </div>
        )}
          </div>
          </div>
          <div className="panel-card-back">
            <div className="panel-card-back-content">
              <div className="panel-card-back-icon">💬</div>
              <div className="panel-card-back-text">Conversation</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

