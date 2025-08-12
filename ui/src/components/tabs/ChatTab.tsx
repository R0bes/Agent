import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgent } from '../../context/AgentContext'
import { Send, Bot, User, Wifi, WifiOff, AlertCircle } from 'lucide-react'

const ChatTab: React.FC = () => {
  const { chatMessages, sendMessage, isProcessing, isConnected, systemInfo } = useAgent()
  const [inputMessage, setInputMessage] = useState('')
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  useEffect(() => {
    if (chatMessages.length > 0) {
      setLastMessageTime(chatMessages[chatMessages.length - 1].timestamp)
    }
  }, [chatMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isProcessing || !isConnected) return

    const message = inputMessage.trim()
    setInputMessage('')
    await sendMessage(message)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getConnectionStatus = () => {
    if (!isConnected) return { text: 'Nicht verbunden', color: 'text-red-400', icon: <WifiOff className="w-4 h-4" /> }
    if (systemInfo?.status === 'healthy') return { text: 'Verbunden', color: 'text-green-400', icon: <Wifi className="w-4 h-4" /> }
    return { text: 'Teilweise verbunden', color: 'text-yellow-400', icon: <AlertCircle className="w-4 h-4" /> }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="h-full flex flex-col">
      {/* Connection Status Bar */}
      <div className="bg-robot-gray-700 p-3 rounded-lg border border-cyber-purple-500 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={connectionStatus.color}>
              {connectionStatus.icon}
            </div>
            <div>
              <span className="text-sm text-robot-gray-400">Chat-Status: </span>
              <span className={`font-semibold ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
            {systemInfo && (
              <div className="flex items-center space-x-2 ml-4">
                <span className="text-xs text-robot-gray-400">Agent:</span>
                <span className="text-xs font-mono text-cyber-purple-400">
                  {systemInfo.agent_id ? systemInfo.agent_id.slice(0, 8) + '...' : 'N/A'}
                </span>
                <span className="text-xs text-robot-gray-400">LLM:</span>
                <span className={`text-xs ${systemInfo.llm_connected ? 'text-green-400' : 'text-red-400'}`}>
                  {systemInfo.llm_connected ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            )}
          </div>
          <div className="text-xs text-robot-gray-400">
            {lastMessageTime ? `Letzte Nachricht: ${formatTime(lastMessageTime)}` : 'Keine Nachrichten'}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-robot-gray-400 py-8"
            >
              <WifiOff className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-lg mb-2">Keine Verbindung zur Agent-API</p>
              <p className="text-sm mb-4">Der Chat ist nicht verfügbar, da keine Verbindung zum Agent-Core besteht</p>
              <div className="bg-robot-gray-800 p-4 rounded-lg border border-robot-gray-600 max-w-md mx-auto">
                <h4 className="text-md font-semibold text-robot-gray-300 mb-2">Verbindungsstatus:</h4>
                <ul className="text-xs text-robot-gray-400 space-y-1 text-left">
                  <li>• Agent-Core läuft auf Port 8000</li>
                  <li>• Nginx-Proxy leitet /api/* weiter</li>
                  <li>• Health-Check: /api/health</li>
                  <li>• Think-API: /api/think</li>
                </ul>
              </div>
            </motion.div>
          ) : chatMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-robot-gray-400 py-8"
            >
              <Bot className="w-12 h-12 mx-auto mb-4 text-cyber-purple-400" />
              <p className="text-lg mb-2">Starte eine Konversation mit dem Agenten</p>
              <p className="text-sm text-robot-gray-500">Der Agent ist bereit und wartet auf deine Nachricht</p>
              
              {systemInfo && (
                <div className="mt-6 bg-robot-gray-800 p-4 rounded-lg border border-cyber-purple-500 max-w-md mx-auto">
                  <h4 className="text-md font-semibold text-cyber-purple-400 mb-3">Agent-Status:</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-robot-gray-400">Status:</span>
                      <span className={`ml-2 font-semibold ${systemInfo.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {systemInfo.status === 'healthy' ? 'Gesund' : 'Fehlerhaft'}
                      </span>
                    </div>
                    <div>
                      <span className="text-robot-gray-400">LLM:</span>
                      <span className={`ml-2 font-semibold ${systemInfo.llm_connected ? 'text-green-400' : 'text-red-400'}`}>
                        {systemInfo.llm_connected ? 'Verbunden' : 'Getrennt'}
                      </span>
                    </div>
                    <div>
                      <span className="text-robot-gray-400">Tools:</span>
                      <span className="ml-2 font-semibold text-cyber-blue-400">{systemInfo.tools_available || 0}</span>
                    </div>
                    <div>
                      <span className="text-robot-gray-400">Agent ID:</span>
                      <span className="ml-2 font-mono text-xs text-cyber-purple-400">
                        {systemInfo.agent_id ? systemInfo.agent_id.slice(0, 8) + '...' : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            chatMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-cyber-purple-600' 
                      : 'bg-robot-gray-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className={`rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-cyber-purple-600 text-white'
                      : 'bg-robot-gray-700 text-robot-gray-100'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-cyber-purple-200' : 'text-robot-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-robot-gray-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-robot-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-cyber-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyber-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-cyber-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-robot-gray-400">Verarbeite...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-robot-gray-600 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isConnected ? "Schreibe deine Nachricht..." : "Chat nicht verfügbar - keine Verbindung"}
            disabled={isProcessing || !isConnected}
            className="flex-1 bg-robot-gray-700 border border-robot-gray-600 rounded-lg px-4 py-2 text-robot-gray-100 placeholder-robot-gray-400 focus:outline-none focus:border-cyber-purple-500 focus:ring-1 focus:ring-cyber-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isProcessing || !isConnected}
            className="cyber-button disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isConnected ? "Chat nicht verfügbar - keine Verbindung" : ""}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        
        {!isConnected && (
          <div className="mt-2 text-xs text-red-400 text-center">
            ⚠️ Chat deaktiviert - Agent-API nicht erreichbar
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatTab
