import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import "./styles.css";
import "./memory-panel.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WebSocketProvider>
      <App />
    </WebSocketProvider>
  </React.StrictMode>
);
