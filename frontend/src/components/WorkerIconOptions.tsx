import React from "react";

/**
 * Icon Option 1: Stacked Layers (aktuell verwendet)
 * Symbolisiert: Schichten/Prozesse/Pipeline
 */
export const WorkersIcon_Layers: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="14" height="12" rx="2" fill="currentColor" opacity="0.1"/>
    <path d="M7 8L10 11L13 8M7 12L10 15L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="6" r="1" fill="currentColor"/>
  </svg>
);

/**
 * Icon Option 2: CPU/Processor
 * Symbolisiert: Computing/Processing/Performance
 */
export const WorkersIcon_CPU: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="8" height="8" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="6" y="6" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 3V6M12 3V6M8 14V17M12 14V17M3 8H6M3 12H6M14 8H17M14 12H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/**
 * Icon Option 3: Gears/Zahnräder
 * Symbolisiert: Mechanik/Automatisierung/System
 */
export const WorkersIcon_Gears: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="10" r="2" fill="currentColor" opacity="0.1"/>
    <circle cx="13" cy="10" r="2" fill="currentColor" opacity="0.1"/>
    <path d="M7 6V8M7 12V14M4 8.5L5.5 9.5M4 11.5L5.5 10.5M10 8.5L8.5 9.5M10 11.5L8.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M13 6V8M13 12V14M10 8.5L11.5 9.5M10 11.5L11.5 10.5M16 8.5L14.5 9.5M16 11.5L14.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="7" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="13" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

/**
 * Icon Option 4: Server Rack
 * Symbolisiert: Backend/Infrastructure/Services
 */
export const WorkersIcon_Server: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="12" height="3" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="4" y="8.5" width="12" height="3" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="4" y="13" width="12" height="3" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="4" y="4" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="4" y="8.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="4" y="13" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="6.5" cy="5.5" r="0.5" fill="currentColor"/>
    <circle cx="6.5" cy="10" r="0.5" fill="currentColor"/>
    <circle cx="6.5" cy="14.5" r="0.5" fill="currentColor"/>
  </svg>
);

/**
 * Icon Option 5: Lightning Bolt/Flash
 * Symbolisiert: Speed/Performance/Power
 */
export const WorkersIcon_Lightning: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" fill="currentColor" opacity="0.1"/>
    <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * Icon Option 6: Robot
 * Symbolisiert: Automation/AI/Workers
 */
export const WorkersIcon_Robot: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="8" height="8" rx="2" fill="currentColor" opacity="0.1"/>
    <rect x="6" y="8" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="10" cy="5" r="1.5" fill="currentColor" opacity="0.2"/>
    <path d="M10 6.5V8M8 11H9M11 11H12M6 13H5M15 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8.5" cy="11" r="0.5" fill="currentColor"/>
    <circle cx="11.5" cy="11" r="0.5" fill="currentColor"/>
  </svg>
);

/**
 * Icon Option 7: Flow/Pipeline
 * Symbolisiert: Workflow/Process/Pipeline
 */
export const WorkersIcon_Flow: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="10" r="2" fill="currentColor" opacity="0.1"/>
    <circle cx="15" cy="10" r="2" fill="currentColor" opacity="0.1"/>
    <circle cx="10" cy="5" r="2" fill="currentColor" opacity="0.1"/>
    <circle cx="10" cy="15" r="2" fill="currentColor" opacity="0.1"/>
    <path d="M7 10H13M10 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="15" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="10" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

/**
 * Icon Option 8: Multiple Users/Team
 * Symbolisiert: Teamwork/Multiple Workers/Collaboration
 */
export const WorkersIcon_Team: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="2.5" fill="currentColor" opacity="0.1"/>
    <circle cx="13" cy="7" r="2.5" fill="currentColor" opacity="0.1"/>
    <path d="M3 16C3 13.5 5 12 7 12C9 12 11 13.5 11 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 16C9 13.5 11 12 13 12C15 12 17 13.5 17 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

