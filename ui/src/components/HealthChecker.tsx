import { useEffect, useRef, useCallback } from 'react';

export interface HealthStatus {
  isHealthy: boolean;
  lastCheck: string;
  responseTime: number;
  error?: string;
}

interface HealthCheckerProps {
  onHealthChange: (status: HealthStatus) => void;
  url?: string;
  interval?: number;
}

export const HealthChecker: React.FC<HealthCheckerProps> = ({
  onHealthChange,
  url = 'http://localhost:8080/health',
  interval = 5000 // Alle 5 Sekunden
}) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkHealth = useCallback(async () => {
    const startTime = Date.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: abortController.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        onHealthChange({
          isHealthy: true,
          lastCheck: new Date().toISOString(),
          responseTime,
        });
      } else {
        onHealthChange({
          isHealthy: false,
          lastCheck: new Date().toISOString(),
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request wurde abgebrochen
      }

      const responseTime = Date.now() - startTime;
      onHealthChange({
        isHealthy: false,
        lastCheck: new Date().toISOString(),
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [url, onHealthChange]);

  useEffect(() => {
    // Sofort ersten Check durchführen
    checkHealth();

    // Regelmäßige Checks starten
    intervalRef.current = setInterval(checkHealth, interval);

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [checkHealth, interval]);

  return null; // Diese Komponente rendert nichts
};
