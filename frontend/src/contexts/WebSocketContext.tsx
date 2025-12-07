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

  useEffect(() => {
    console.log("[SOCKET-INIT] Initializing Socket.IO connection to", SOCKET_URL);
    
    const socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling']
    });

    socketInstance.on("connect", () => {
      console.log("[SOCKET-CONNECT] Connected successfully, ID:", socketInstance.id);
      setStatus("connected");
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[SOCKET-DISCONNECT] Disconnected:", reason);
      setStatus("disconnected");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("[SOCKET-ERROR] Connection error:", error);
      setStatus("disconnected");
    });

    socketInstance.on("connection_established", (data) => {
      console.log("[SOCKET-MESSAGE] Connection established:", data);
    });

    // Listen to all event types from backend
    ["message_created", "job_updated", "memory_updated", "gui_action", "avatar_command"].forEach(eventType => {
      socketInstance.on(eventType, (data) => {
        console.log(`[SOCKET-MESSAGE] ${eventType} received:`, data);
        // data is already the full event object { type, payload } from backend
        emit(data);
      });
    });

    setSocket(socketInstance);

    return () => {
      console.log("[SOCKET-CLEANUP] Closing connection");
      socketInstance.close();
    };
  }, []);

  const sendToBackend = useCallback((event: { type: string; payload: any }) => {
    if (socket && socket.connected) {
      console.log("[SOCKET-SEND] Sending event:", event.type);
      socket.emit(event.type, event.payload);
    } else {
      console.warn("[SOCKET-SEND] Not connected, cannot send:", event);
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    console.log("[SOCKET-RECONNECT] Manually reconnecting...");
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
