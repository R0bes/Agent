/**
 * Service Status Bar
 * 
 * Displays status labels for all backend services in the top-left corner.
 * Polls the backend for service health status.
 */

import React, { useState, useEffect } from "react";

interface ServiceStatus {
  id: string;
  name: string;
  running: boolean;
  healthy: boolean;
  lastCheck: number;
  error?: string;
}

interface ServiceStatusBarProps {
  className?: string;
}

export const ServiceStatusBar: React.FC<ServiceStatusBarProps> = ({ className = "" }) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/services/status");
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.data) {
            setServices(data.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch service status:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div
      className={`service-status-bar ${className}`}
      style={{
        position: "fixed",
        top: "8px",
        left: "8px",
        display: "flex",
        flexDirection: "row",
        gap: "8px",
        zIndex: 1000,
        flexWrap: "wrap",
        maxWidth: "calc(100vw - 16px)"
      }}
    >
      {services.map((service) => (
        <div
          key={service.id}
          className={`service-status-label ${service.healthy ? "healthy" : "unhealthy"}`}
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 500,
            backgroundColor: service.healthy ? "#10b981" : "#ef4444",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)"
          }}
          title={
            service.healthy
              ? `${service.name}: Healthy`
              : `${service.name}: ${service.error || "Unhealthy"}`
          }
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: service.healthy ? "#ffffff" : "#ffffff",
              display: "inline-block"
            }}
          />
          {service.name}
        </div>
      ))}
    </div>
  );
};

