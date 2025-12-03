import React from "react";
import { ChatView } from "./components/ChatView";

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="persona-avatar" />
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="persona-name">Your Agent</div>
          <div id="persona-status" className="persona-status">
            Ready
          </div>
        </header>

        <section className="chat-section">
          <ChatView />
        </section>
      </main>

      <aside className="right-panel">
        <section className="panel">
          <div className="panel-header">
            <span>Background jobs</span>
            <span className="panel-count">0</span>
          </div>
          <div className="panel-body muted">Jobs panel stub</div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span>Memory</span>
            <span className="panel-count">0</span>
          </div>
          <div className="panel-body muted">Memory panel stub</div>
        </section>
      </aside>
    </div>
  );
};
