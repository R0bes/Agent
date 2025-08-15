import React from 'react';
import type { ConnectionStatus } from './WebSocketManager';
import './OnlineIndicator.css';

interface OnlineIndicatorProps {
  status: ConnectionStatus;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ status }) => {
  const getStatusColor = () => {
    if (status.isConnecting) return 'gray';
    if (status.isOnline) return 'green';
    return 'red';
  };

  const getStatusText = () => {
    if (status.isConnecting) return 'Verbinde...';
    if (status.isOnline) return 'Online';
    return 'Offline';
  };

  const getStatusIcon = () => {
    if (status.isConnecting) return '⏳';
    if (status.isOnline) return '●';
    return '●';
  };

  const getStatusDetails = () => {
    if (status.isConnecting) {
      return 'Verbinde mit Core-Service...';
    }
    if (status.isOnline) {
      return 'Core-Service ist online und verbunden';
    }
    return 'Core-Service ist offline oder nicht erreichbar';
  };

  return (
    <div className="online-indicator">
      <div 
        className="status-dot"
        style={{ backgroundColor: getStatusColor() }}
        title={getStatusDetails()}
      >
        <span className="status-icon">{getStatusIcon()}</span>
      </div>
      <span className="status-text">{getStatusText()}</span>
      
      {status.lastSeen && !status.isOnline && (
        <span className="last-seen">
          Zuletzt gesehen: {new Date(status.lastSeen).toLocaleTimeString('de-DE')}
        </span>
      )}
    </div>
  );
};
