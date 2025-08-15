import React, { useState, useCallback } from 'react';
import { WebSocketManager } from './WebSocketManager';
import type { ChatMessage, ConnectionStatus } from './WebSocketManager';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { OnlineIndicator } from './OnlineIndicator';
import { getWebSocketUrl } from '../config';
import './ChatWindow.css';

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: false,
    isConnecting: true
  });
  const [useStreaming, setUseStreaming] = useState<boolean>(true); // Standardmäßig Streaming aktiviert

  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Streaming-Nachrichten verarbeiten
      if (message.type === 'streaming_start') {
        // Neue Streaming-Nachricht hinzufügen
        return [...prev, message];
      }
      else if (message.type === 'streaming_token') {
        // Bestehende Streaming-Nachricht erweitern
        return prev.map(msg => 
          msg.streamId === message.streamId 
            ? { ...msg, content: msg.content + message.content }
            : msg
        );
      }
      else if (message.type === 'streaming_end') {
        // Streaming beenden, aber den Inhalt beibehalten
        return prev.map(msg => 
          msg.streamId === message.streamId 
            ? { ...msg, isStreaming: false, type: 'response' }
            : msg
        );
      }
      else {
        // Normale Nachricht hinzufügen
        return [...prev, message];
      }
    });
  }, []);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString(),
      sender: 'user',
      type: 'message'
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);

    // Send message via WebSocket mit Streaming-Option
    if ((window as any).sendMessage) {
      const messageType = useStreaming ? 'stream_request' : 'message';
      (window as any).sendMessage({
        type: messageType,
        content: content
      });
    }
  }, [useStreaming]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1>Core Service Chat</h1>
          <div className="streaming-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={useStreaming}
                onChange={(e) => setUseStreaming(e.target.checked)}
              />
              <span className="toggle-text">
                {useStreaming ? '🚀 Streaming' : '📝 Normal'}
              </span>
            </label>
          </div>
        </div>
        <OnlineIndicator status={connectionStatus} />
      </div>
      
      <div className="chat-content">
        <MessageList messages={messages} />
      </div>
      
      <div className="chat-footer">
        <MessageInput
          onSendMessage={handleSendMessage}
          isConnected={connectionStatus.isOnline}
          disabled={false}
        />
      </div>
      
      <WebSocketManager
        onMessage={handleNewMessage}
        onStatusChange={handleStatusChange}
        url={getWebSocketUrl()}
      />
    </div>
  );
};
