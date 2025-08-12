import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  source: string
  metadata?: any
}

export interface SystemInfo {
  status: string
  agent_id: string
  llm_connected: boolean
  tools_available: number
  current_state?: string
  iteration_count?: number
  version?: string
  uptime?: number
  memory_usage?: number
  cpu_usage?: number
}

export interface ChatMessage {
  id: string
  timestamp: Date
  type: 'user' | 'agent'
  content: string
  reasoning?: string
  metadata?: any
}

export interface ReasoningStep {
  id: string
  timestamp: Date
  state: string
  message: string
  metadata?: any
}

interface AgentContextType {
  // State
  logs: LogEntry[]
  systemInfo: SystemInfo | null
  chatMessages: ChatMessage[]
  reasoningSteps: ReasoningStep[]
  isConnected: boolean
  
  // Actions
  sendMessage: (message: string) => Promise<void>
  clearLogs: () => void
  refreshSystemInfo: () => Promise<void>
  loadLogs: () => Promise<void>
  
  // Loading states
  isLoading: boolean
  isProcessing: boolean
  
  // Connection info
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error'
  lastConnectionAttempt: Date | null
  connectionError: string | null
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export const useAgent = () => {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider')
  }
  return context
}

interface AgentProviderProps {
  children: ReactNode
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [reasoningSteps] = useState<ReasoningStep[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected')
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<Date | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Add log entry
  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }
    setLogs(prev => [newEntry, ...prev].slice(0, 1000)) // Keep last 1000 logs
  }

  // Load logs from backend
  const loadLogs = async () => {
    if (!isConnected) {
      console.log('⚠️ [LOGS] Logs nicht geladen - nicht verbunden')
      return
    }
    
    try {
      console.log('📋 [LOGS] Lade Logs vom Backend...')
      const response = await fetch('/api/logs?limit=100')
      console.log('📋 [LOGS] Response erhalten:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 [LOGS] Response-Daten:', data)
        
        const backendLogs: LogEntry[] = data.logs.map((log: any) => ({
          id: log.id || Math.random().toString(36).substr(2, 9),
          timestamp: new Date(log.timestamp || Date.now()),
          level: (log.level || 'info').toLowerCase() as 'info' | 'warning' | 'error' | 'success',
          message: log.message || 'No message',
          source: log.source || 'unknown',
          metadata: log.metadata
        }))
        
        console.log('📋 [LOGS] Verarbeitete Logs:', backendLogs.length)
        setLogs(backendLogs)
        addLog({
          level: 'success',
          message: `${backendLogs.length} Logs vom Backend geladen`,
          source: 'logs_api'
        })
      } else {
        const errorText = await response.text()
        console.error('❌ [LOGS] HTTP-Fehler:', response.status, response.statusText)
        console.error('❌ [LOGS] Error-Body:', errorText)
        
        addLog({
          level: 'error',
          message: `Fehler beim Laden der Logs: ${response.status} ${response.statusText}`,
          source: 'logs_api',
          metadata: { error_body: errorText }
        })
      }
    } catch (error) {
      console.error('❌ [LOGS] Exception:', error)
      addLog({
        level: 'error',
        message: `Fehler beim Laden der Logs: ${error}`,
        source: 'logs_api',
        metadata: { error_type: error instanceof Error ? error.constructor.name : typeof error }
      })
    }
  }

  // Check health and connection
  const checkHealth = async () => {
    console.log('🔍 [HEALTH] Starte Health-Check...')
    setConnectionStatus('connecting')
    setLastConnectionAttempt(new Date())
    
    try {
      console.log('🔍 [HEALTH] Rufe /api/health auf...')
      const response = await fetch('/api/health')
      console.log('🔍 [HEALTH] Response erhalten:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 [HEALTH] Response-Daten:', data)
        
        // Validate and set system info
        const validatedInfo: SystemInfo = {
          status: data.status || 'unknown',
          agent_id: data.agent_id || 'unknown',
          llm_connected: data.llm_connected || false,
          tools_available: data.tools_available || 0,
          current_state: data.current_state,
          iteration_count: data.iteration_count,
          version: data.version,
          uptime: data.uptime,
          memory_usage: data.memory_usage,
          cpu_usage: data.cpu_usage
        }
        
        console.log('🔍 [HEALTH] Validierte Info:', validatedInfo)
        setSystemInfo(validatedInfo)
        setIsConnected(true)
        setConnectionStatus('connected')
        setConnectionError(null)
        
        addLog({
          level: 'success',
          message: 'Agent erfolgreich verbunden',
          source: 'health_check',
          metadata: { 
            status: validatedInfo.status,
            tools: validatedInfo.tools_available,
            llm: validatedInfo.llm_connected
          }
        })
      } else {
        console.error('❌ [HEALTH] HTTP-Fehler:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ [HEALTH] Error-Body:', errorText)
        
        setIsConnected(false)
        setConnectionStatus('error')
        setConnectionError(`HTTP ${response.status}: ${response.statusText}`)
        
        addLog({
          level: 'error',
          message: `Verbindung zum Agent fehlgeschlagen: ${response.status} ${response.statusText}`,
          source: 'health_check',
          metadata: { error_body: errorText }
        })
      }
    } catch (error) {
      console.error('❌ [HEALTH] Exception:', error)
      setIsConnected(false)
      setConnectionStatus('error')
      setConnectionError(error instanceof Error ? error.message : String(error))
      
      addLog({
        level: 'error',
        message: `Verbindungsfehler: ${error}`,
        source: 'health_check',
        metadata: { error_type: error instanceof Error ? error.constructor.name : typeof error }
      })
    }
  }

  // Send message to agent
  const sendMessage = async (message: string) => {
    if (!message.trim() || !isConnected) {
      console.log('⚠️ [CHAT] Nachricht nicht gesendet - nicht verbunden oder leere Nachricht')
      return
    }

    console.log('🚀 [CHAT] Starte Nachrichtenverarbeitung:', message)
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type: 'user',
      content: message
    }

    setChatMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    try {
      console.log('🚀 [CHAT] Sende Anfrage an /api/think...')
      addLog({
        level: 'info',
        message: `Verarbeite Anfrage: ${message}`,
        source: 'chat'
      })

      const requestBody = {
        query: message,
        allow_subtasks: true,
        max_subtask_depth: 2
      }
      console.log('🚀 [CHAT] Request-Body:', requestBody)

      const response = await fetch('/api/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('🚀 [CHAT] Response erhalten:', response.status, response.statusText)
      console.log('🚀 [CHAT] Response-Headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log('🚀 [CHAT] Response-Daten:', data)
        
        const agentMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          type: 'agent',
          content: data.result || data.response || 'Keine Antwort erhalten',
          metadata: data
        }

        console.log('🚀 [CHAT] Agent-Nachricht erstellt:', agentMessage)
        setChatMessages(prev => [...prev, agentMessage])
        
        addLog({
          level: 'success',
          message: 'Anfrage erfolgreich verarbeitet',
          source: 'chat',
          metadata: { 
            result_length: agentMessage.content.length,
            response_time: Date.now() - userMessage.timestamp.getTime()
          }
        })
      } else {
        const errorText = await response.text()
        console.error('❌ [CHAT] HTTP-Fehler:', response.status, response.statusText)
        console.error('❌ [CHAT] Error-Body:', errorText)
        
        addLog({
          level: 'error',
          message: `Fehler beim Verarbeiten der Anfrage: ${response.status} ${response.statusText}`,
          source: 'chat',
          metadata: { error: errorText }
        })
        
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          type: 'agent',
          content: `❌ Fehler: ${response.status} ${response.statusText}`,
          metadata: { error: true }
        }
        setChatMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('❌ [CHAT] Exception:', error)
      addLog({
        level: 'error',
        message: `Fehler beim Verarbeiten der Anfrage: ${error}`,
        source: 'chat'
      })
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        type: 'agent',
        content: `❌ Verbindungsfehler: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true }
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      console.log('🏁 [CHAT] Verarbeitung abgeschlossen')
      setIsProcessing(false)
    }
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
    addLog({
      level: 'info',
      message: 'Alle Logs gelöscht',
      source: 'system'
    })
  }

  // Refresh system info
  const refreshSystemInfo = async () => {
    setIsLoading(true)
    try {
      await checkHealth()
    } finally {
      setIsLoading(false)
    }
  }

  // Initial health check and log loading
  useEffect(() => {
    console.log('🚀 [INIT] AgentContext initialisiert - starte Health-Check...')
    checkHealth()
    
    // Set up periodic refresh
    const healthInterval = setInterval(() => {
      console.log('🔄 [HEALTH] Periodischer Health-Check...')
      checkHealth()
    }, 30000) // Every 30 seconds
    
    return () => {
      console.log('🧹 [INIT] Cleanup: Health-Interval gestoppt')
      clearInterval(healthInterval)
    }
  }, [])

  // Load logs when connected
  useEffect(() => {
    if (isConnected) {
      console.log('📋 [LOGS] Verbunden - starte Log-Loading...')
      loadLogs()
      const logsInterval = setInterval(() => {
        console.log('🔄 [LOGS] Periodisches Log-Loading...')
        loadLogs()
      }, 10000) // Every 10 seconds
      return () => {
        console.log('🧹 [LOGS] Cleanup: Logs-Interval gestoppt')
        clearInterval(logsInterval)
      }
    } else {
      console.log('⚠️ [LOGS] Nicht verbunden - Log-Loading übersprungen')
    }
  }, [isConnected])

  const value: AgentContextType = {
    logs,
    systemInfo,
    chatMessages,
    reasoningSteps,
    isConnected,
    sendMessage,
    clearLogs,
    refreshSystemInfo,
    loadLogs,
    isLoading,
    isProcessing,
    connectionStatus,
    lastConnectionAttempt,
    connectionError,
  }

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  )
}
