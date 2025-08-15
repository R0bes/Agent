// WebSocket-Konfiguration für den Core-Service
export const config = {
  websocket: {
    // Standard-Konfiguration
    protocol: 'ws',
    host: 'localhost',
    port: '9797', // Port auf 9797 geändert (Core-Server)
    endpoint: '/ws', // WebSocket-Endpoint auf /ws geändert
    
    // Komplette URL (falls gesetzt)
    url: undefined as string | undefined,
  },
  health: {
    // Health-Check-Konfiguration
    protocol: 'http',
    host: 'localhost',
    port: '9797', // Port auf 9797 geändert (Core-Server)
    endpoint: '/health',
    interval: 5000, // 5 Sekunden
    
    // Komplette URL (falls gesetzt)
    url: undefined as string | undefined,
  }
};

// WebSocket-URL generieren
export const getWebSocketUrl = (): string => {
  // Prüfe Umgebungsvariable für komplette URL
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }
  
  // Prüfe individuelle Umgebungsvariablen
  const protocol = import.meta.env.VITE_WEBSOCKET_PROTOCOL || config.websocket.protocol;
  const host = import.meta.env.VITE_WEBSOCKET_HOST || config.websocket.host;
  const port = import.meta.env.VITE_WEBSOCKET_PORT || config.websocket.port;
  const endpoint = import.meta.env.VITE_WEBSOCKET_ENDPOINT || config.websocket.endpoint;
  
  return `${protocol}://${host}:${port}${endpoint}`;
};

// Health-Check-URL generieren
export const getHealthUrl = (): string => {
  // Prüfe Umgebungsvariable für komplette URL
  if (import.meta.env.VITE_HEALTH_URL) {
    return import.meta.env.VITE_HEALTH_URL;
  }
  
  // Prüfe individuelle Umgebungsvariablen
  const protocol = import.meta.env.VITE_HEALTH_PROTOCOL || config.health.protocol;
  const host = import.meta.env.VITE_HEALTH_HOST || config.health.host;
  const port = import.meta.env.VITE_HEALTH_PORT || config.health.port;
  const endpoint = import.meta.env.VITE_HEALTH_ENDPOINT || config.health.endpoint;
  
  return `${protocol}://${host}:${port}${endpoint}`;
};

// Konfiguration zur Laufzeit ändern
export const updateWebSocketConfig = (newConfig: Partial<typeof config.websocket>) => {
  Object.assign(config.websocket, newConfig);
};

export const updateHealthConfig = (newConfig: Partial<typeof config.health>) => {
  Object.assign(config.health, newConfig);
};
