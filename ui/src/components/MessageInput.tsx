import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isConnected,
  disabled = false
}) => {
  const [message, setMessage] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && isConnected) {
      onSendMessage(trimmedMessage);
      setMessage('');
  
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const isSendDisabled = !message.trim() || disabled || !isConnected;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="message-input">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Nachricht eingeben..." : "Nicht verbunden..."}
          disabled={disabled || !isConnected}
          className="message-textarea"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={isSendDisabled}
          className="send-button"
          title="Nachricht senden (Enter)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22,2 15,22 11,13 2,9"></polygon>
          </svg>
        </button>
      </div>
      
      {!isConnected && (
        <div className="connection-warning">
          <span>⚠️ Nicht mit dem Core-Service verbunden</span>
        </div>
      )}
    </div>
  );
};
