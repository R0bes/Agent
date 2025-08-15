import { useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'core';
  type: 'message' | 'response' | 'streaming_start' | 'streaming_token' | 'streaming_end';
  isStreaming?: boolean;
  streamId?: string;
}

export interface ConnectionStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastSeen?: string;
}

interface WebSocketManagerProps {
  onMessage: (message: ChatMessage) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  url?: string;
}

export const WebSocketManager: React.FC<WebSocketManagerProps> = ({
  onMessage,
  onStatusChange,
  url = 'ws://localhost:9797/ws/client1'
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    onStatusChange({ isOnline: false, isConnecting: true });

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        onStatusChange({ 
          isOnline: true, 
          isConnecting: false,
          lastSeen: new Date().toISOString()
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Streaming-Nachrichten verarbeiten
          if (data.type === 'streaming_start') {
            const message: ChatMessage = {
              id: data.streamId || Date.now().toString(),
              content: '',
              timestamp: data.timestamp || new Date().toISOString(),
              sender: 'core',
              type: 'streaming_start',
              isStreaming: true,
              streamId: data.streamId
            };
            onMessage(message);
          }
          else if (data.type === 'streaming_token') {
            const message: ChatMessage = {
              id: data.streamId || Date.now().toString(),
              content: data.content,
              timestamp: data.timestamp || new Date().toISOString(),
              sender: 'core',
              type: 'streaming_token',
              isStreaming: true,
              streamId: data.streamId
            };
            onMessage(message);
          }
          else if (data.type === 'streaming_end') {
            const message: ChatMessage = {
              id: data.streamId || Date.now().toString(),
              content: data.content,
              timestamp: data.timestamp || new Date().toISOString(),
              sender: 'core',
              type: 'streaming_end',
              isStreaming: false,
              streamId: data.streamId
            };
            onMessage(message);
          }
          // Normale Nachrichten (für Kompatibilität)
          else if (data.type === 'message') {
            const message: ChatMessage = {
              id: Date.now().toString(),
              content: data.content,
              timestamp: data.timestamp || new Date().toISOString(),
              sender: 'core',
              type: 'response'
            };
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        onStatusChange({ 
          isOnline: false, 
          isConnecting: false,
          lastSeen: new Date().toISOString()
        });
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStatusChange({ 
          isOnline: false, 
          isConnecting: false,
          lastSeen: new Date().toISOString()
        });
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      onStatusChange({ isOnline: false, isConnecting: false });
    }
  }, [url, onStatusChange]);

  const sendMessage = useCallback((messageData: string | { type: string; content: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      let message;
      
      if (typeof messageData === 'string') {
        // Kompatibilität: String wird als normale Nachricht behandelt
        message = {
          type: 'message',
          content: messageData,
          timestamp: new Date().toISOString()
        };
      } else {
        // Objekt wird direkt gesendet
        message = {
          ...messageData,
          timestamp: new Date().toISOString()
        };
      }
      
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Expose sendMessage function to parent component
  useEffect(() => {
    (window as any).sendMessage = sendMessage;
    return () => {
      delete (window as any).sendMessage;
    };
  }, [sendMessage]);

  return null; // This component doesn't render anything
};
