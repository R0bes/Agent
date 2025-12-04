import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { emit } from "../eventBus";

type WebSocketStatus = "disconnected" | "connecting" | "connected";

interface WebSocketContextType {
  status: WebSocketStatus;
  ws: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextType>({ status: "disconnected", ws: null });

export const useWebSocket = () => useContext(WebSocketContext);

// Use direct backend connection in dev mode, proxy in production
const WS_URL = import.meta.env.DEV
  ? "ws://localhost:3001/ws"  // Direct connection in development
  : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

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
  }, []);

  function connectWebSocket() {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setStatus("connecting");
    const wsInstance = new WebSocket(WS_URL);
    wsRef.current = wsInstance;
    setWs(wsInstance);

    wsInstance.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
    };

    wsInstance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "connection_established") {
          setStatus("connected");
          return;
        }
        
        emit(data);
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    wsInstance.onclose = (event) => {
      const closeInfo = {
        code: event.code,
        reason: event.reason || "No reason provided",
        wasClean: event.wasClean,
        url: WS_URL
      };
      console.error("WebSocket closed", closeInfo);
      
      // Log close code meanings
      const closeCodeMeanings: Record<number, string> = {
        1000: "Normal Closure",
        1001: "Going Away",
        1002: "Protocol Error",
        1003: "Unsupported Data",
        1006: "Abnormal Closure",
        1007: "Invalid frame payload data",
        1008: "Policy Violation",
        1009: "Message too big",
        1010: "Mandatory Extension",
        1011: "Internal Server Error",
        1012: "Service Restart",
        1013: "Try Again Later",
        1014: "Bad Gateway",
        1015: "TLS Handshake"
      };
      console.error(`Close code ${event.code}: ${closeCodeMeanings[event.code] || "Unknown"}`);
      
      setStatus("disconnected");
      wsRef.current = null;
      setWs(null);
      
      // Always try to reconnect unless it was a clean close (code 1000)
      if (event.code !== 1000) {
        const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };

    wsInstance.onerror = (error) => {
      console.error("WebSocket error:", error);
      console.error("WebSocket URL:", WS_URL);
      console.error("WebSocket readyState:", wsInstance.readyState);
      setStatus("disconnected");
      setWs(null);
    };
  }

  return (
    <WebSocketContext.Provider value={{ status, ws }}>
      {children}
    </WebSocketContext.Provider>
  );
};

