import React from "react";

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  active = false,
  disabled = false,
  variant = "default",
  size = "md"
}) => {
  const sizeClasses = {
    sm: "icon-btn-sm",
    md: "icon-btn-md",
    lg: "icon-btn-lg"
  };

  return (
    <button
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

