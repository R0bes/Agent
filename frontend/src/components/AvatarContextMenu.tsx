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
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 40 - 10);

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
      {items.map((item, index) => (
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
          {item.label}
        </button>
      ))}
    </div>
  );
};

