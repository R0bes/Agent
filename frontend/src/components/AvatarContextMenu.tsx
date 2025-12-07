import React, { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

interface AvatarContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export const AvatarContextMenu: React.FC<AvatarContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const menuWidth = 220; // min-width from CSS
  const itemHeight = 36; // Approximate height per item
  const menuPadding = 8; // padding from CSS
  const estimatedHeight = items.length * itemHeight + menuPadding * 2;
  
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - estimatedHeight - 10);

  return (
    <div
      ref={menuRef}
      className="avatar-context-menu"
      style={{
        position: "fixed",
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        zIndex: 10001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        // Render separator
        if (item.label === "---") {
          return (
            <div
              key={index}
              className="avatar-context-menu-separator"
            />
          );
        }

        // Render disabled header
        if (item.disabled && item.label !== "---") {
          return (
            <div
              key={index}
              className="avatar-context-menu-header"
            >
              {item.label}
            </div>
          );
        }

        // Extract hotkey from label if present (format: "Name (hotkey)")
        const hotkeyMatch = item.label.match(/\(([^)]+)\)$/);
        const displayLabel = hotkeyMatch ? item.label.replace(/\s*\([^)]+\)$/, '') : item.label;
        const hotkey = hotkeyMatch ? hotkeyMatch[1] : null;

        // Render normal menu item
        return (
          <button
            key={index}
            className={`avatar-context-menu-item ${item.disabled ? "disabled" : ""}`}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            <span>{displayLabel}</span>
            {hotkey && (
              <span className="avatar-context-menu-hotkey">{hotkey}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

