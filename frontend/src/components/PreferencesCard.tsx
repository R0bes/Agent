import React, { useState } from "react";
import { IconButton } from "./IconButton";
import { SettingsIcon } from "./Icons";

export const PreferencesCard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <>
      <div className={`panel-card-overlay ${isOpen ? "panel-card-overlay-open" : ""}`} onClick={onClose} />
      <div className={`panel-card panel-card-preferences ${isOpen ? "panel-card-open" : ""}`}>
        <div className="panel-card-inner">
          <div className="panel-card-front">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <SettingsIcon />
                <span>Preferences</span>
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
              <div className="settings-section">
                <h3 className="settings-section-title">Appearance</h3>
                <div className="settings-option">
                  <label className="settings-label">Theme</label>
                  <div className="settings-toggle-group">
                    <button
                      className={`settings-toggle-btn ${theme === "dark" ? "active" : ""}`}
                      onClick={() => setTheme("dark")}
                    >
                      Dark
                    </button>
                    <button
                      className={`settings-toggle-btn ${theme === "light" ? "active" : ""}`}
                      onClick={() => setTheme("light")}
                    >
                      Light
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Notifications</h3>
                <div className="settings-option">
                  <label className="settings-label">Enable notifications</label>
                  <button
                    className={`settings-switch ${notifications ? "active" : ""}`}
                    onClick={() => setNotifications(!notifications)}
                  >
                    <span className="settings-switch-slider"></span>
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">General</h3>
                <div className="settings-option">
                  <label className="settings-label">Auto-save</label>
                  <button
                    className={`settings-switch ${autoSave ? "active" : ""}`}
                    onClick={() => setAutoSave(!autoSave)}
                  >
                    <span className="settings-switch-slider"></span>
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">About</h3>
                <div className="settings-info">
                  <div className="settings-info-item">
                    <span className="settings-info-label">Version</span>
                    <span className="settings-info-value">1.0.0</span>
                  </div>
                  <div className="settings-info-item">
                    <span className="settings-info-label">Build</span>
                    <span className="settings-info-value">2024.01</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="panel-card-back">
            <div className="panel-card-back-content">
              <div className="panel-card-back-icon">⚙️</div>
              <div className="panel-card-back-text">Configuring...</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

