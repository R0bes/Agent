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

export const MemoryIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2C6.13401 2 3 5.13401 3 9C3 12.866 6.13401 16 10 16C13.866 16 17 12.866 17 9C17 5.13401 13.866 2 10 2Z" fill="currentColor" opacity="0.1"/>
    <path d="M10 6V10L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

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

