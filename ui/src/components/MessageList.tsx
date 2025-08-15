import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from './WebSocketManager';
import './MessageList.css';

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="empty-state">
          <p>Noch keine Nachrichten</p>
          <span>Beginnen Sie eine Konversation mit dem Core-Service</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.sender === 'user' ? 'user' : 'core'} ${message.isStreaming ? 'streaming' : ''}`}
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
          <div className="message-avatar">
            {message.sender === 'user' ? '👤' : '🤖'}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
