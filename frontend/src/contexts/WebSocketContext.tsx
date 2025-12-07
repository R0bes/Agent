import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { emit } from "../eventBus";

type WebSocketStatus = "disconnected" | "connecting" | "connected";

interface WebSocketContextType {
  status: WebSocketStatus;
  sendToBackend: (event: { type: string; payload: any }) => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({ 
  status: "disconnected", 
  sendToBackend: () => {},
  reconnect: () => {}
});

export const useWebSocket = () => useContext(WebSocketContext);

const SOCKET_URL = import.meta.env.DEV
  ? "http://localhost:3001"
  : location.origin;

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [socket, setSocket] = useState<Socket | null>(null);
  const isConnectedRef = React.useRef(false);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling']
    });

    socketInstance.on("connect", () => {
      console.info("WebSocket: connected");
      setStatus("connected");
      isConnectedRef.current = true;
    });

    socketInstance.on("disconnect", (reason) => {
      isConnectedRef.current = false;
      if (reason !== "io client disconnect") {
        console.warn("WebSocket: disconnected", reason);
      }
      setStatus("disconnected");
    });

    socketInstance.on("connect_error", (error) => {
      // Only log if not already connected (to avoid spam during reconnection)
      if (!isConnectedRef.current) {
        console.warn("WebSocket: connection error", error.message);
      }
      setStatus("disconnected");
    });

    // Listen to all event types from backend
    ["message_created", "job_updated", "memory_updated", "gui_action", "avatar_command", "tool_execute", "tool_executed"].forEach(eventType => {
      socketInstance.on(eventType, (data) => {
        // data is already the full event object { type, payload } from backend
        if (data && typeof data === 'object') {
          // If data already has type and payload, use it directly
          if (data.type && data.payload) {
            emit(data);
          } else {
            // Otherwise, wrap it in the event format
            emit({ type: eventType, payload: data });
          }
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  const sendToBackend = useCallback((event: { type: string; payload: any }) => {
    if (socket && socket.connected) {
      socket.emit(event.type, event.payload);
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.connect();
    }
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{ status, sendToBackend, reconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};
