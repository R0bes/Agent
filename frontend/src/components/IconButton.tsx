import React, { useRef, useEffect, useCallback } from "react";
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
  
  // Memoize callbacks to prevent unnecessary re-registrations
  const onInteractRef = useRef(onInteract);
  const getBoundsRef = useRef(getBounds);
  
  // Update refs when callbacks change
  useEffect(() => {
    onInteractRef.current = onInteract;
    getBoundsRef.current = getBounds;
  }, [onInteract, getBounds]);

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
        await onInteractRef.current();
      },
      getBounds: () => getBoundsRef.current()
    };

    register(element);
    return () => {
      unregister(id);
    };
  }, [aiControllable, id, type, label, description, register, unregister]);
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

  // Memoize interaction callback
  const handleInteract = useCallback(async () => {
    if (onClick && !disabled) {
      onClick();
    }
  }, [onClick, disabled]);

  // Memoize bounds getter
  const getBounds = useCallback(() => {
    return buttonRef.current?.getBoundingClientRect() || new DOMRect();
  }, []);

  // Register as AI-controllable if enabled
  useConditionalAIControllable(
    aiControllable,
    aiId || `button-${title || 'unknown'}`,
    'button',
    title || 'Button',
    `Button: ${title || 'Unknown'}`,
    handleInteract,
    getBounds
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

