import React, { useRef, useEffect } from "react";
import { useAIControllableContext } from "../ai-controllable/AIControllableContext";
import type { AIControllableElement, AIControllableElementType } from "../ai-controllable/types";

// Helper hook that only registers if aiControllable is true
const useConditionalAIControllable = (
  aiControllable: boolean,
  id: string,
  type: AIControllableElementType,
  label: string,
  description: string | undefined,
  onInteract: () => Promise<void>,
  getBounds: () => DOMRect
) => {
  const { register, unregister } = useAIControllableContext();

  useEffect(() => {
    if (!aiControllable) return;

    const element: AIControllableElement = {
      id,
      type,
      label,
      description,
      select: () => {
        // Visual selection handled by overlay
      },
      interact: async () => {
        await onInteract();
      },
      getBounds
    };

    register(element);
    return () => {
      unregister(id);
    };
  }, [aiControllable, id, type, label, description, onInteract, getBounds, register, unregister]);
};

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  aiControllable?: boolean;
  aiId?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  active = false,
  disabled = false,
  variant = "default",
  size = "md",
  aiControllable = false,
  aiId
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sizeClasses = {
    sm: "icon-btn-sm",
    md: "icon-btn-md",
    lg: "icon-btn-lg"
  };

  // Register as AI-controllable if enabled
  useConditionalAIControllable(
    aiControllable,
    aiId || `button-${title || 'unknown'}`,
    'button',
    title || 'Button',
    `Button: ${title || 'Unknown'}`,
    async () => {
      if (onClick && !disabled) {
        onClick();
      }
    },
    () => buttonRef.current?.getBoundingClientRect() || new DOMRect()
  );

  return (
    <button
      ref={buttonRef}
      className={`icon-btn icon-btn-${variant} ${sizeClasses[size]} ${active ? "icon-btn-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
};

