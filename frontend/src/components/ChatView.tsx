import React, { useEffect, useRef, useState } from "react";
import { emit } from "../eventBus";
import { useWebSocket } from "../contexts/WebSocketContext";
import { IconButton } from "./IconButton";
import { SendIcon, MicrophoneIcon, StopIcon } from "./Icons";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState({ seconds: 0, milliseconds: 0 });
  const { status, ws } = useWebSocket();
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const amplitudeHistoryRef = useRef<number[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);
  const conversationId = "main";
  const userId = "user-123";

  // Auto-resize textarea up to 5 lines
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get accurate scrollHeight
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
      
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 5 * 21; // 5 lines * line-height (14px * 1.5 ≈ 21px)
      
      // Nur Scrollbar anzeigen, wenn Inhalt wirklich größer als maxHeight ist (mit Toleranz für Rundungsfehler)
      if (scrollHeight > maxHeight + 2) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  }, [text]);

  // Update recording duration timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      recordingStartTimeRef.current = Date.now();
      intervalId = setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        const seconds = Math.floor(elapsed / 1000);
        const milliseconds = Math.floor((elapsed % 1000) / 10); // Show centiseconds (00-99)
        setRecordingDuration({ seconds, milliseconds });
      }, 10); // Update every 10ms for smooth millisecond display
    } else {
      setRecordingDuration({ seconds: 0, milliseconds: 0 });
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);

  // Start/stop visualization when recording state changes
  useEffect(() => {
    isRecordingRef.current = isRecording;
    
    if (isRecording && canvasRef.current) {
      timeRef.current = 0;
      amplitudeHistoryRef.current = [];
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        visualizeSimulatedAudio();
      }, 10);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording]);

  // Listen to WebSocket messages from context
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "connection_established") {
          return;
        }
        
        if (data.type === "message_created") {
          const m = data.payload as Message;
          setMessages((prev) => [...prev, m]);
          scrollToBottom();
          const el = document.getElementById("persona-status");
          if (el) el.textContent = "Ready";
        }
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }

  // Simulated audio recording functions
  function startRecording() {
    setIsRecording(true);
  }

  function stopRecording() {
    setIsRecording(false);
  }

  function visualizeSimulatedAudio() {
    if (!canvasRef.current) {
      return;
    }
    
    function draw() {
      // Check if still recording using ref to avoid stale closure
      if (!canvasRef.current) {
        return;
      }
      
      const currentCanvas = canvasRef.current;
      const currentCtx = currentCanvas.getContext("2d");
      if (!currentCtx) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      // Ensure canvas dimensions match its display size
      const rect = currentCanvas.getBoundingClientRect();
      const displayWidth = Math.max(rect.width, 100);
      const displayHeight = Math.max(rect.height, 40);
      
      if (currentCanvas.width !== displayWidth || currentCanvas.height !== displayHeight) {
        currentCanvas.width = displayWidth;
        currentCanvas.height = displayHeight;
      }
      
      timeRef.current += 0.03;
      
      // Generate simulated amplitude using multiple sine waves for realistic variation
      // Start with fade-in to avoid hard transition
      const fadeInDuration = 0.5; // Fade in over 0.5 seconds
      const fadeInFactor = Math.min(1, timeRef.current / fadeInDuration);
      
      const baseAmplitude = 0.4 + Math.sin(timeRef.current * 1.5) * 0.3;
      const variation1 = Math.sin(timeRef.current * 4.2) * 0.25;
      const variation2 = Math.sin(timeRef.current * 7.1) * 0.15;
      const noise = (Math.random() - 0.5) * 0.15;
      
      const rawAmplitude = baseAmplitude + variation1 + variation2 + noise;
      const amplitude = Math.max(0, Math.min(0.95, rawAmplitude * fadeInFactor));
      
      // Update amplitude history (keep last 300 samples for smooth visualization)
      amplitudeHistoryRef.current.push(amplitude);
      if (amplitudeHistoryRef.current.length > 300) {
        amplitudeHistoryRef.current.shift();
      }
      
      // Draw waveform bars (SoundCloud style) - scrolling from right to left
      currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      
      const centerY = currentCanvas.height / 2;
      const samples = amplitudeHistoryRef.current.length;
      
      // Draw horizontal center line (lightning blue)
      currentCtx.strokeStyle = "rgba(0, 191, 255, 0.3)";
      currentCtx.lineWidth = 1;
      currentCtx.beginPath();
      currentCtx.moveTo(0, centerY);
      currentCtx.lineTo(currentCanvas.width, centerY);
      currentCtx.stroke();
      
      // Draw waveform bars (lightning blue)
      currentCtx.fillStyle = "rgba(0, 191, 255, 0.9)";
      
      const availableWidth = currentCanvas.width;
      const barWidth = 2;
      const barGap = 1;
      const totalBarWidth = barWidth + barGap;
      const numBars = Math.floor(availableWidth / totalBarWidth);
      
      if (samples === 0) {
        // Draw initial line when starting (lightning blue)
        currentCtx.strokeStyle = "rgba(0, 191, 255, 0.9)";
        currentCtx.lineWidth = 2;
        currentCtx.beginPath();
        currentCtx.moveTo(availableWidth, centerY);
        currentCtx.lineTo(availableWidth, centerY);
        currentCtx.stroke();
      } else {
        // Draw bars scrolling from right to left
        // The most recent sample is at the right edge
        // Older samples scroll to the left
        
        for (let i = 0; i < numBars; i++) {
          // Calculate which sample to use (most recent at right, older at left)
          // We want the newest samples at the right edge
          const sampleIndex = samples - 1 - i;
          
          if (sampleIndex >= 0) {
            const amplitudeValue = amplitudeHistoryRef.current[sampleIndex] || 0.1;
            
            // Calculate bar height (symmetrical, like SoundCloud)
            const maxBarHeight = (currentCanvas.height / 2) - 2; // Leave 2px margin
            const barHeight = amplitudeValue * maxBarHeight;
            
            // Position of the bar - start from right edge
            const x = availableWidth - (i + 1) * totalBarWidth;
            
            // Draw bar (symmetrical top and bottom)
            currentCtx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
          }
        }
      }
      
      // Continue animation only if still recording
      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    }
    
    draw();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const userMessage: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text.trimEnd(), // trimEnd() behält Zeilenumbrüche, entfernt nur trailing spaces
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();
    setText("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const el = document.getElementById("persona-status");
    if (el) el.textContent = "Thinking…";

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userId,
          text: userMessage.content
        })
      });
    } catch (err) {
      console.error(err);
      if (el) el.textContent = "Error";
    }
  }

  return (
    <div className="chat">
      <div className="message-list" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "message " + (m.role === "user" ? "message-user" : "message-assistant")
            }
          >
            {m.content}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <IconButton
          icon={isRecording ? <StopIcon /> : <MicrophoneIcon />}
          onClick={() => {
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          variant="ghost"
          title={isRecording ? "Stop recording" : "Record audio"}
        />
        {isRecording ? (
          <canvas
            ref={canvasRef}
            className="audio-visualization"
          />
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) {
                  handleSubmit(e);
                }
              }
            }}
          />
        )}
        {isRecording ? (
          <div className="recording-duration">
            {Math.floor(recordingDuration.seconds / 60)}:{(recordingDuration.seconds % 60).toString().padStart(2, '0')}.{recordingDuration.milliseconds.toString().padStart(2, '0')}
          </div>
        ) : (
          <IconButton
            icon={<SendIcon />}
            onClick={() => {
              if (text.trim()) {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                handleSubmit(fakeEvent);
              }
            }}
            disabled={!text.trim()}
            variant="ghost"
            title="Send message"
          />
        )}
      </form>
    </div>
  );
};
