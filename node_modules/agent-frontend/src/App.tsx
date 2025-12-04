import React, { useState } from "react";
import { ChatView } from "./components/ChatView";
import { JobsCard } from "./components/JobsCard";
import { MemoryCard } from "./components/MemoryCard";
import { SettingsCard } from "./components/SettingsCard";
import { ToolsCard } from "./components/ToolsCard";
import { LogsPanel } from "./components/LogsPanel";
import { IconButton } from "./components/IconButton";
import { BotIcon, JobsIcon, MemoryIcon, SettingsIcon, ToolsIcon, LogsIcon } from "./components/Icons";
import { useWebSocket } from "./contexts/WebSocketContext";

type ActivePanel = "jobs" | "memory" | "settings" | "tools" | null;

export const App: React.FC = () => {
  const [logsOpen, setLogsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const { status } = useWebSocket();

  const handlePanelToggle = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-content">
          <div 
            className={`persona-avatar persona-avatar-${status}`}
            title={`WebSocket: ${status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Disconnected"}`}
          />
          <nav className="sidebar-nav">
            <IconButton
              icon={<BotIcon />}
              title="Chat"
              active={activePanel === null}
              variant="ghost"
              onClick={() => setActivePanel(null)}
            />
            <IconButton
              icon={<JobsIcon />}
              title="Jobs"
              active={activePanel === "jobs"}
              variant="ghost"
              onClick={() => handlePanelToggle("jobs")}
            />
            <IconButton
              icon={<MemoryIcon />}
              title="Memory"
              active={activePanel === "memory"}
              variant="ghost"
              onClick={() => handlePanelToggle("memory")}
            />
            <div className="sidebar-divider" />
            <IconButton
              icon={<ToolsIcon />}
              title="Tools"
              active={activePanel === "tools"}
              variant="ghost"
              onClick={() => handlePanelToggle("tools")}
            />
            <IconButton
              icon={<SettingsIcon />}
              title="Settings"
              active={activePanel === "settings"}
              variant="ghost"
              onClick={() => handlePanelToggle("settings")}
            />
            <IconButton
              icon={<LogsIcon />}
              title="Logs"
              active={logsOpen}
              variant="ghost"
              onClick={() => setLogsOpen(!logsOpen)}
            />
          </nav>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
        </header>

        <section className="chat-section">
          <ChatView />
        </section>
      </main>

      {/* Rotating Panel Cards */}
      <div className="panel-cards-container">
        <JobsCard isOpen={activePanel === "jobs"} onClose={() => setActivePanel(null)} />
        <MemoryCard isOpen={activePanel === "memory"} onClose={() => setActivePanel(null)} />
        <ToolsCard isOpen={activePanel === "tools"} onClose={() => setActivePanel(null)} />
        <SettingsCard isOpen={activePanel === "settings"} onClose={() => setActivePanel(null)} />
      </div>

      {/* Logs Panel with integrated button */}
      <LogsPanel isOpen={logsOpen} onClose={() => setLogsOpen(false)} onOpen={() => setLogsOpen(true)} />
    </div>
  );
};
