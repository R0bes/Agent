import React, { useEffect, useRef, useState } from "react";
import { subscribe } from "../eventBus";
import { useWebSocket } from "../contexts/WebSocketContext";
import { IconButton } from "./IconButton";
import { SendIcon, MicrophoneIcon, StopIcon } from "./Icons";

type MessageRole = "user" | "assistant" | "tool" | "system";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  conversationId?: string;
  metadata?: {
    toolName?: string;
    toolArgs?: any;
    toolResult?: any;
    jobId?: string;
    jobStatus?: string;
    processingDuration?: number;
    sourceKind?: string;
    llmCalls?: Array<{ role: string; content: string; model?: string }>;
    contextInfo?: {
      historyCount?: number;
      memoryCount?: number;
      estimatedTokens?: number;
    };
    toolExecutions?: Array<{
      toolName: string;
      args: any;
      status: string;
      result?: any;
      timestamp?: string;
      completedAt?: string;
    }>;
    [key: string]: any;
  };
}

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState({ seconds: 0, milliseconds: 0 });
  const [showMeta, setShowMeta] = useState(false);
  const { status } = useWebSocket();
  const metaDataRef = useRef<Map<string, any>>(new Map()); // Store meta data by message ID
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

  // Listen to all relevant events for meta information
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      console.log("[ChatView] Event received:", event);
      
      if (event.type === "message_created") {
        console.log("[ChatView] message_created payload:", event.payload);
        const m = event.payload as Message;
        console.log("[ChatView] Adding message to state:", m);
        
        // Merge with any collected meta data
        const messageId = m.id;
        const metaData = metaDataRef.current.get(messageId) || {};
        const messageWithMeta: Message = {
          ...m,
          metadata: {
            ...m.metadata,
            ...metaData
          }
        };
        
        setMessages((prev) => {
          console.log("[ChatView] Previous messages:", prev);
          const newMessages = [...prev, messageWithMeta];
          console.log("[ChatView] New messages:", newMessages);
          return newMessages;
        });
        
        // Keep meta data for future updates
        if (Object.keys(metaData).length > 0) {
          metaDataRef.current.set(messageId, metaData);
        }
        
        scrollToBottom();
        const el = document.getElementById("persona-status");
        if (el) el.textContent = "Ready";
      } else if (event.type === "tool_execute") {
        // Store tool execution start - attach to most recent assistant message
        const payload = event.payload as { id: string; toolName: string; args: any; ctx: any };
        const msgConversationId = payload.ctx?.conversationId || conversationId;
        
        setMessages((prev) => {
          // Find the most recent assistant message for this conversation
          const lastAssistant = [...prev].reverse().find(m => 
            m.role === "assistant" && (m.conversationId === msgConversationId || !m.conversationId)
          );
          
          if (lastAssistant) {
            const meta = metaDataRef.current.get(lastAssistant.id) || {};
            const toolExecutions = meta.toolExecutions || [];
            
            // Add new tool execution
            const newExecution = {
              toolName: payload.toolName,
              args: payload.args,
              status: "executing" as const,
              timestamp: new Date().toISOString()
            };
            
            const updatedMeta = {
              ...meta,
              toolExecutions: [...toolExecutions, newExecution]
            };
            
            metaDataRef.current.set(lastAssistant.id, updatedMeta);
            
            // Update the message in state
            return prev.map(m => 
              m.id === lastAssistant.id 
                ? { ...m, metadata: { ...m.metadata, ...updatedMeta } }
                : m
            );
          }
          return prev;
        });
      } else if (event.type === "tool_executed") {
        // Store tool execution result
        const payload = event.payload as { executionId: string; toolName: string; result: any; ctx: any };
        const msgConversationId = payload.ctx?.conversationId || conversationId;
        
        setMessages((prev) => {
          // Find the most recent assistant message for this conversation
          const lastAssistant = [...prev].reverse().find(m => 
            m.role === "assistant" && (m.conversationId === msgConversationId || !m.conversationId)
          );
          
          if (lastAssistant) {
            const meta = metaDataRef.current.get(lastAssistant.id) || {};
            const toolExecutions = meta.toolExecutions || [];
            
            // Update the tool execution status
            const updatedExecutions = toolExecutions.map((exec: any) => {
              if (exec.toolName === payload.toolName && exec.status === "executing") {
                return {
                  ...exec,
                  status: payload.result?.ok ? "completed" : "failed",
                  result: payload.result,
                  completedAt: new Date().toISOString()
                };
              }
              return exec;
            });
            
            const updatedMeta = {
              ...meta,
              toolExecutions: updatedExecutions
            };
            
            metaDataRef.current.set(lastAssistant.id, updatedMeta);
            
            // Update the message in state
            return prev.map(m => 
              m.id === lastAssistant.id 
                ? { ...m, metadata: { ...m.metadata, ...updatedMeta } }
                : m
            );
          }
          return prev;
        });
      } else if (event.type === "job_updated") {
        // Store job updates - attach to most recent assistant message
        const payload = event.payload as { jobs: Array<{ id: string; status: string; [key: string]: any }> };
        
        setMessages((prev) => {
          const lastAssistant = [...prev].reverse().find(m => m.role === "assistant");
          
          if (lastAssistant && payload.jobs && payload.jobs.length > 0) {
            const meta = metaDataRef.current.get(lastAssistant.id) || {};
            const updatedMeta = {
              ...meta,
              jobs: payload.jobs
            };
            
            metaDataRef.current.set(lastAssistant.id, updatedMeta);
            
            return prev.map(m => 
              m.id === lastAssistant.id 
                ? { ...m, metadata: { ...m.metadata, ...updatedMeta } }
                : m
            );
          }
          return prev;
        });
      }
    });

    return unsubscribe;
  }, [conversationId]);

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
      
      // Draw horizontal center line (user blue)
      currentCtx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      currentCtx.lineWidth = 1;
      currentCtx.beginPath();
      currentCtx.moveTo(0, centerY);
      currentCtx.lineTo(currentCanvas.width, centerY);
      currentCtx.stroke();
      
      // Draw waveform bars (user blue)
      currentCtx.fillStyle = "rgba(59, 130, 246, 0.9)";
      
      const availableWidth = currentCanvas.width;
      const barWidth = 2;
      const barGap = 1;
      const totalBarWidth = barWidth + barGap;
      const numBars = Math.floor(availableWidth / totalBarWidth);
      
      if (samples === 0) {
        // Draw initial line when starting (user blue)
        currentCtx.strokeStyle = "rgba(59, 130, 246, 0.9)";
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
      createdAt: new Date().toISOString(),
      conversationId,
      metadata: {
        sourceKind: "gui"
      }
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
      <button
        type="button"
        className={`meta-toggle ${showMeta ? "meta-toggle-active" : ""}`}
        onClick={() => setShowMeta(!showMeta)}
        title={showMeta ? "Hide meta information" : "Show meta information"}
        aria-label={showMeta ? "Hide meta information" : "Show meta information"}
      />
      <div className="message-list" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "message " + (m.role === "user" ? "message-user" : "message-assistant")
            }
          >
            <div className="message-content">{m.content}</div>
            {showMeta && m.metadata && Object.keys(m.metadata).length > 0 && (
              <div className="message-meta">
                {m.metadata.processingDuration && (
                  <div className="meta-item">
                    <span className="meta-label">Processing:</span>
                    <span className="meta-value">{m.metadata.processingDuration}ms</span>
                  </div>
                )}
                {m.metadata.toolExecutions && m.metadata.toolExecutions.length > 0 && (
                  <div className="meta-item">
                    <span className="meta-label">Tools:</span>
                    <div className="meta-tools">
                      {m.metadata.toolExecutions.map((exec: any, idx: number) => (
                        <div key={idx} className="meta-tool">
                          <span className="tool-name">{exec.toolName}</span>
                          <span className={`tool-status tool-status-${exec.status}`}>
                            {exec.status}
                          </span>
                          {exec.result && (
                            <div className="tool-result">
                              {exec.result.ok ? "✓" : "✗"} {exec.result.error || "Success"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {m.metadata.contextInfo && (
                  <div className="meta-item">
                    <span className="meta-label">Context:</span>
                    <span className="meta-value">
                      {m.metadata.contextInfo.historyCount || 0} msgs, {m.metadata.contextInfo.memoryCount || 0} memories, ~{m.metadata.contextInfo.estimatedTokens || 0} tokens
                    </span>
                  </div>
                )}
                {m.metadata.sourceKind && (
                  <div className="meta-item">
                    <span className="meta-label">Source:</span>
                    <span className="meta-value">{m.metadata.sourceKind}</span>
                  </div>
                )}
                {m.metadata.jobs && m.metadata.jobs.length > 0 && (
                  <div className="meta-item">
                    <span className="meta-label">Jobs:</span>
                    <div className="meta-jobs">
                      {m.metadata.jobs.map((job: any, idx: number) => (
                        <div key={idx} className="meta-job">
                          <span className="job-id">{job.id}</span>
                          <span className={`job-status job-status-${job.status}`}>
                            {job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
