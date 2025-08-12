import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgent } from '../../context/AgentContext'
import { Brain, Lightbulb, Zap, Target, ArrowRight, Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface ReasoningStep {
  id: string
  timestamp: Date
  state: string
  message: string
  confidence?: number
  metadata?: any
}

const ReasoningTab: React.FC = () => {
  const { isProcessing, isConnected, systemInfo } = useAgent()
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([])
  const [currentStep, setCurrentStep] = useState<string>('idle')

  // Simulate reasoning steps when processing
  useEffect(() => {
    if (isProcessing && isConnected) {
      const steps = [
        {
          id: '1',
          timestamp: new Date(),
          state: 'INIT',
          message: 'Initialisiere den Denkprozess...',
          confidence: 0.9
        },
        {
          id: '2',
          timestamp: new Date(Date.now() + 1000),
          state: 'PLANNING',
          message: 'Analysiere Benutzeranfrage und formuliere Plan',
          confidence: 0.85
        },
        {
          id: '3',
          timestamp: new Date(Date.now() + 2000),
          state: 'TOOL_EXECUTION',
          message: 'Führe Web-Suche mit Parametern aus',
          confidence: 0.92
        },
        {
          id: '4',
          timestamp: new Date(Date.now() + 3000),
          state: 'REFLECTION',
          message: 'Bewerte Ergebnisse und erwäge Alternativen',
          confidence: 0.78
        },
        {
          id: '5',
          timestamp: new Date(Date.now() + 4000),
          state: 'RESULT_SYNTHESIS',
          message: 'Synthetisiere finale Antwort aus gesammelten Informationen',
          confidence: 0.95
        }
      ]

      setReasoningSteps(steps)
      
      // Simulate step-by-step progression
      steps.forEach((step, index) => {
        setTimeout(() => {
          setCurrentStep(step.state)
        }, index * 1000)
      })
    } else {
      setReasoningSteps([])
      setCurrentStep('idle')
    }
  }, [isProcessing, isConnected])

  const getStateColor = (state: string) => {
    switch (state) {
      case 'INIT': return '#3b82f6'
      case 'PLANNING': return '#8b5cf6'
      case 'TOOL_EXECUTION': return '#10b981'
      case 'REFLECTION': return '#f59e0b'
      case 'RESULT_SYNTHESIS': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'INIT': return <Target className="w-4 h-4" />
      case 'PLANNING': return <Brain className="w-4 h-4" />
      case 'TOOL_EXECUTION': return <Zap className="w-4 h-4" />
      case 'REFLECTION': return <Lightbulb className="w-4 h-4" />
      case 'RESULT_SYNTHESIS': return <Target className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getConnectionStatus = () => {
    if (!isConnected) return { text: 'Nicht verbunden', color: 'text-red-400', icon: <WifiOff className="w-4 h-4" /> }
    if (systemInfo?.status === 'healthy') return { text: 'Verbunden', color: 'text-green-400', icon: <Wifi className="w-4 h-4" /> }
    return { text: 'Teilweise verbunden', color: 'text-yellow-400', icon: <AlertCircle className="w-4 h-4" /> }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Connection Status Bar */}
      <div className="bg-robot-gray-700 p-3 rounded-lg border border-cyber-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={connectionStatus.color}>
              {connectionStatus.icon}
            </div>
            <div>
              <span className="text-sm text-robot-gray-400">Reasoning-Status: </span>
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
            {isProcessing ? 'Verarbeite...' : 'Bereit'}
          </div>
        </div>
      </div>

      {/* Current State Display */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h3 className="text-xl font-bold text-cyber-purple-400 mb-4">🧠 Aktueller Reasoning-Zustand</h3>
        
        {!isConnected ? (
          <div className="text-center py-8">
            <WifiOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-robot-gray-400 mb-2">Keine Verbindung zur Agent-API</p>
            <p className="text-sm text-robot-gray-500">Reasoning-Funktionen sind nicht verfügbar</p>
          </div>
        ) : currentStep === 'idle' ? (
          <div className="text-center py-8">
            <Brain className="w-16 h-16 mx-auto mb-4 text-robot-gray-400" />
            <p className="text-robot-gray-400">Warte auf den Beginn der Verarbeitung...</p>
            {systemInfo && (
              <div className="mt-4 bg-robot-gray-800 p-3 rounded-lg border border-cyber-purple-500 max-w-md mx-auto">
                <p className="text-xs text-robot-gray-400">Agent bereit für Reasoning-Aufgaben</p>
                <p className="text-xs text-cyber-purple-400">Verfügbare Tools: {systemInfo.tools_available || 0}</p>
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            className="flex items-center space-x-4 p-4 bg-robot-gray-800 rounded-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: getStateColor(currentStep) }}
            >
              {getStateIcon(currentStep)}
            </div>
            <div className="flex-1">
              <div className="font-mono text-lg font-bold" style={{ color: getStateColor(currentStep) }}>
                {currentStep}
              </div>
              <div className="text-robot-gray-400 text-sm">
                {reasoningSteps.find(step => step.state === currentStep)?.message || 'Verarbeite...'}
              </div>
            </div>
            {isProcessing && (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-cyber-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyber-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyber-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Reasoning Steps Timeline */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h3 className="text-xl font-bold text-cyber-purple-400 mb-4">📊 Reasoning-Zeitlinie</h3>
        
        {!isConnected ? (
          <div className="text-center py-8 text-robot-gray-400">
            <p>Keine Reasoning-Daten verfügbar - keine Verbindung</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {reasoningSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyber-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 bg-robot-gray-800 p-4 rounded-lg border-l-4"
                       style={{ borderLeftColor: getStateColor(step.state) }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getStateColor(step.state) }}
                        />
                        <span className="font-mono text-sm font-bold" style={{ color: getStateColor(step.state) }}>
                          {step.state}
                        </span>
                      </div>
                      <div className="text-xs text-robot-gray-400">
                        {formatTime(step.timestamp)}
                      </div>
                    </div>
                    
                    <p className="text-robot-gray-200 text-sm mb-2">{step.message}</p>
                    
                    {step.confidence && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-robot-gray-400">Vertrauen:</span>
                        <div className="flex-1 bg-robot-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${step.confidence * 100}%`,
                              backgroundColor: getStateColor(step.state)
                            }}
                          />
                        </div>
                        <span className="text-xs text-cyber-purple-400">
                          {Math.round(step.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrow to next step */}
                  {index < reasoningSteps.length - 1 && (
                    <div className="flex-shrink-0 flex items-center">
                      <ArrowRight className="w-4 h-4 text-robot-gray-500" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Neural Network Visualization */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h3 className="text-xl font-bold text-cyber-purple-400 mb-4">🕸️ Neuronales Netzwerk-Aktivität</h3>
        
        {!isConnected ? (
          <div className="text-center py-8 text-robot-gray-400">
            <p>Netzwerk-Visualisierung nicht verfügbar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Network Nodes */}
            <div>
              <h4 className="text-lg font-semibold text-robot-gray-300 mb-4">Aktive Knoten</h4>
              <div className="space-y-3">
                {['Eingabe-Schicht', 'Versteckte Schicht 1', 'Versteckte Schicht 2', 'Ausgabe-Schicht'].map((layer) => (
                  <motion.div
                    key={layer}
                    className="flex items-center justify-between p-3 bg-robot-gray-800 rounded border border-cyber-purple-500"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-cyber-purple-400 animate-pulse"></div>
                      <span className="text-sm text-robot-gray-200">{layer}</span>
                    </div>
                    <div className="text-xs text-cyber-purple-400">
                      {Math.floor(Math.random() * 100)}% aktiv
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Connection Strength */}
            <div>
              <h4 className="text-lg font-semibold text-robot-gray-300 mb-4">Verbindungsstärke</h4>
              <div className="space-y-3">
                {['Abfrage-Analyse', 'Kontext-Verarbeitung', 'Tool-Auswahl', 'Antwort-Generierung'].map((connection) => (
                  <motion.div
                    key={connection}
                    className="p-3 bg-robot-gray-800 rounded"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-robot-gray-200">{connection}</span>
                      <span className="text-xs text-cyber-purple-400">
                        {Math.floor(Math.random() * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-robot-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.random() * 100}%`,
                          backgroundColor: '#8b5cf6'
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thought Process */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h3 className="text-xl font-bold text-cyber-purple-400 mb-4">💭 Denkprozess</h3>
        
        {!isConnected ? (
          <div className="text-center py-8 text-robot-gray-400">
            <p>Keine Denkprozess-Daten verfügbar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              "Analysiere Benutzerabsicht und Kontext...",
              "Identifiziere relevante Tools und Fähigkeiten...",
              "Formuliere schrittweisen Ausführungsplan...",
              "Führe Tools aus und sammle Informationen...",
              "Bewerte Ergebnisse und erwäge Alternativen...",
              "Synthetisiere umfassende Antwort..."
            ].map((thought, index) => (
              <motion.div
                key={index}
                className="flex items-start space-x-3 p-3 bg-robot-gray-800 rounded border-l-2 border-cyber-purple-500"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="w-2 h-2 rounded-full bg-cyber-purple-400 mt-2"></div>
                <p className="text-sm text-robot-gray-200">{thought}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReasoningTab
