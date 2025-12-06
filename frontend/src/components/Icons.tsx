import React from "react";

export const SendIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8L14 2L10 8L14 14L2 8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BotIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="12" height="10" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="6" y="8" width="8" height="6" rx="1" fill="currentColor"/>
    <circle cx="8" cy="11" r="1" fill="var(--bg)"/>
    <circle cx="12" cy="11" r="1" fill="var(--bg)"/>
    <path d="M6 6V4C6 2.89543 6.89543 2 8 2H12C13.1046 2 14 2.89543 14 4V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const JobsIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="14" height="12" rx="2" fill="currentColor" opacity="0.1"/>
    <path d="M6 4V2M14 4V2M4 8H16M4 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const BrainIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3C8.5 3 7.5 4 7 5.5C6 5 5 5.5 5 7C5 8.5 6 9.5 7.5 9.5C7.5 10.5 8 11.5 9 12C8 12.5 7.5 13.5 7.5 14.5C7.5 16 8.5 17 10 17C11.5 17 12.5 16 12.5 14.5C12.5 13.5 12 12.5 11 12C12 11.5 12.5 10.5 12.5 9.5C14 9.5 15 8.5 15 7C15 5.5 14 5 13 5.5C12.5 4 11.5 3 10 3Z" fill="currentColor" opacity="0.1"/>
    <path d="M10 3C8.5 3 7.5 4 7 5.5C6 5 5 5.5 5 7C5 8.5 6 9.5 7.5 9.5C7.5 10.5 8 11.5 9 12C8 12.5 7.5 13.5 7.5 14.5C7.5 16 8.5 17 10 17C11.5 17 12.5 16 12.5 14.5C12.5 13.5 12 12.5 11 12C12 11.5 12.5 10.5 12.5 9.5C14 9.5 15 8.5 15 7C15 5.5 14 5 13 5.5C12.5 4 11.5 3 10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 7.5C8.5 7.5 9 7.8 9.2 8.2M10.8 8.2C11 7.8 11.5 7.5 12 7.5M8.5 11.5C8.8 11.2 9.2 11 9.5 11C9.8 11 10.2 11.2 10.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const MemoryIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="5" rx="7" ry="2" fill="currentColor" opacity="0.1"/>
    <ellipse cx="10" cy="5" rx="7" ry="2" stroke="currentColor" strokeWidth="1.5"/>
    <ellipse cx="10" cy="10" rx="7" ry="2" fill="currentColor" opacity="0.1"/>
    <ellipse cx="10" cy="10" rx="7" ry="2" stroke="currentColor" strokeWidth="1.5"/>
    <ellipse cx="10" cy="15" rx="7" ry="2" fill="currentColor" opacity="0.1"/>
    <ellipse cx="10" cy="15" rx="7" ry="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 5V15M17 5V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="5" r="1" fill="currentColor" opacity="0.5"/>
    <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.5"/>
    <circle cx="10" cy="15" r="1" fill="currentColor" opacity="0.5"/>
  </svg>
);

// Keep BookIcon as alias for backward compatibility
export const BookIcon = MemoryIcon;

export const SettingsIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="2.5" fill="currentColor" opacity="0.2"/>
    <path d="M10 4V2M10 18V16M16 10H18M2 10H4M15.6569 4.34315L14.2426 5.75736M5.75736 14.2426L4.34315 15.6569M15.6569 15.6569L14.2426 14.2426M5.75736 5.75736L4.34315 4.34315" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const LogsIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="14" height="12" rx="1" fill="currentColor" opacity="0.1"/>
    <path d="M6 8H14M6 12H10M6 10H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 4H16M4 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const ToolsIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
    <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" opacity="0.1"/>
    <path d="M6 6L14 6M6 14L14 14M6 6L6 14M14 6L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const ToolboxIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="7" width="14" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M7 7V5C7 4.44772 7.44772 4 8 4H12C12.5523 4 13 4.44772 13 5V7" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 11H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="11" r="1" fill="currentColor"/>
  </svg>
);

export const WorkersIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Robot Head */}
    <rect x="5" y="6" width="10" height="10" rx="2" fill="currentColor" opacity="0.1"/>
    <rect x="5" y="6" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    {/* Antenna */}
    <path d="M10 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="3" r="1" fill="currentColor" opacity="0.6"/>
    {/* Eyes */}
    <circle cx="7.5" cy="10" r="1" fill="currentColor"/>
    <circle cx="12.5" cy="10" r="1" fill="currentColor"/>
    {/* Mouth */}
    <path d="M7 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Decorative lines */}
    <path d="M5 9H15M5 12H15" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
  </svg>
);

export const QueueIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const PriorityHighIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 12V4M8 4L5 7M8 4L11 7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PriorityNormalIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 8H12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const PriorityLowIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4V12M8 12L5 9M8 12L11 9" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ConversationIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main speech bubble - rounded and elegant */}
    <path d="M5 4C3.89543 4 3 4.89543 3 6V9C3 10.1046 3.89543 11 5 11H8L11 14V11C11.5523 11 12 10.5523 12 10V6C12 4.89543 11.1046 4 10 4H5Z" fill="currentColor" opacity="0.1"/>
    <path d="M5 4C3.89543 4 3 4.89543 3 6V9C3 10.1046 3.89543 11 5 11H8L11 14V11C11.5523 11 12 10.5523 12 10V6C12 4.89543 11.1046 4 10 4H5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Elegant speech bubble tail */}
    <path d="M5 11L3 13.5L5 12.5V11Z" fill="currentColor" opacity="0.1"/>
    <path d="M5 11L3 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Text lines - cleaner design */}
    <path d="M5.5 7H9.5M5.5 9H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>
  </svg>
);

export const PreferencesIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6" fill="currentColor" opacity="0.1"/>
    <path d="M10 2L11.5 5.5L15.5 4L13.5 7L17 8.5L13.5 10L17 11.5L13.5 13L15.5 16L11.5 14.5L10 18L8.5 14.5L4.5 16L6.5 13L3 11.5L6.5 10L3 8.5L6.5 7L4.5 4L8.5 5.5L10 2Z" fill="currentColor" opacity="0.2"/>
    <path d="M10 2L11.5 5.5L15.5 4L13.5 7L17 8.5L13.5 10L17 11.5L13.5 13L15.5 16L11.5 14.5L10 18L8.5 14.5L4.5 16L6.5 13L3 11.5L6.5 10L3 8.5L6.5 7L4.5 4L8.5 5.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="10" r="2.5" fill="currentColor" opacity="0.3"/>
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7" fill="currentColor" opacity="0.1"/>
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 6V10L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="14" height="13" rx="2" fill="currentColor" opacity="0.1"/>
    <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 8H17M6 4V2M14 4V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="7" cy="11" r="0.5" fill="currentColor"/>
    <circle cx="10" cy="11" r="0.5" fill="currentColor"/>
    <circle cx="13" cy="11" r="0.5" fill="currentColor"/>
    <circle cx="7" cy="14" r="0.5" fill="currentColor"/>
    <circle cx="10" cy="14" r="0.5" fill="currentColor"/>
  </svg>
);

export const RepeatIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 6H4C3.44772 6 3 6.44772 3 7V11C3 11.5523 3.44772 12 4 12H14M14 6L11 3M14 6L11 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 14H16C16.5523 14 17 13.5523 17 13V9C17 8.44772 16.5523 8 16 8H6M6 14L9 17M6 14L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MicrophoneIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C7.17157 1 6.5 1.67157 6.5 2.5V8C6.5 8.82843 7.17157 9.5 8 9.5C8.82843 9.5 9.5 8.82843 9.5 8V2.5C9.5 1.67157 8.82843 1 8 1Z" fill="currentColor" opacity="0.2"/>
    <path d="M8 1C7.17157 1 6.5 1.67157 6.5 2.5V8C6.5 8.82843 7.17157 9.5 8 9.5C8.82843 9.5 9.5 8.82843 9.5 8V2.5C9.5 1.67157 8.82843 1 8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 7V8C4 10.2091 5.79086 12 8 12C10.2091 12 12 10.2091 12 8V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 12V15M6 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const StopIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M5 4H11M5 4V13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7V11M9 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

