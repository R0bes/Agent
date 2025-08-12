import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgent } from '../../context/AgentContext'
import { Search, Filter, Trash2, Download, AlertCircle, Info, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

const DevLogsTab: React.FC = () => {
  const { logs, clearLogs, loadLogs, isConnected, systemInfo } = useAgent()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastLogUpdate, setLastLogUpdate] = useState<Date>(new Date())

  const levels = ['all', 'info', 'warning', 'error', 'success']
  const sources = ['all', 'health_check', 'chat', 'fsm', 'llm', 'tools', 'logs_api', 'system']

  // Auto-refresh logs every 10 seconds if connected
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(async () => {
      try {
        await loadLogs()
        setLastLogUpdate(new Date())
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [isConnected, loadLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.source.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel
      const matchesSource = selectedSource === 'all' || log.source === selectedSource
      
      return matchesSearch && matchesLevel && matchesSource
    })
  }, [logs, searchTerm, selectedLevel, selectedSource])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info className="w-4 h-4 text-cyber-blue-400" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
      default: return <Info className="w-4 h-4 text-cyber-purple-400" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'border-cyber-blue-500 text-cyber-blue-400'
      case 'warning': return 'border-yellow-500 text-yellow-400'
      case 'error': return 'border-red-500 text-red-400'
      case 'success': return 'border-green-500 text-green-400'
      default: return 'border-cyber-purple-500 text-cyber-purple-400'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadLogs()
      setLastLogUpdate(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      source: log.source,
      message: log.message,
      metadata: log.metadata
    }))

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
              <span className="text-sm text-robot-gray-400">API Status: </span>
              <span className={`font-semibold ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
            {systemInfo && (
              <div className="flex items-center space-x-2 ml-4">
                <span className="text-xs text-robot-gray-400">Agent ID:</span>
                <span className="text-xs font-mono text-cyber-purple-400">
                  {systemInfo.agent_id ? systemInfo.agent_id.slice(0, 8) + '...' : 'N/A'}
                </span>
                <span className="text-xs text-robot-gray-400">Tools:</span>
                <span className="text-xs text-cyber-blue-400">{systemInfo.tools_available || 0}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-robot-gray-400">
            Letzte Aktualisierung: {lastLogUpdate.toLocaleTimeString('de-DE')}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-robot-gray-700 p-4 rounded-lg border border-cyber-purple-500 mb-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-robot-gray-400" />
              <input
                type="text"
                placeholder="Logs durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-robot-gray-800 border border-robot-gray-600 rounded-lg text-robot-gray-100 placeholder-robot-gray-400 focus:outline-none focus:border-cyber-purple-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 bg-robot-gray-800 border border-robot-gray-600 rounded-lg text-robot-gray-100 focus:outline-none focus:border-cyber-purple-500"
            >
              {levels.map(level => (
                <option key={level} value={level}>
                  {level === 'all' ? 'Alle Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 bg-robot-gray-800 border border-robot-gray-600 rounded-lg text-robot-gray-100 focus:outline-none focus:border-cyber-purple-500"
            >
              {sources.map(source => (
                <option key={source} value={source}>
                  {source === 'all' ? 'Alle Quellen' : source.replace('_', ' ').charAt(0).toUpperCase() + source.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !isConnected}
              className="cyber-button"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Lade...' : 'Aktualisieren'}
            </button>
            <button
              onClick={exportLogs}
              className="cyber-button"
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportieren
            </button>
            <button
              onClick={clearLogs}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 transform hover:scale-105"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-robot-gray-400">
          <span>Gesamt: {logs.length}</span>
          <span>Gefiltert: {filteredLogs.length}</span>
          <span>Info: {logs.filter(l => l.level === 'info').length}</span>
          <span>Warnungen: {logs.filter(l => l.level === 'warning').length}</span>
          <span>Fehler: {logs.filter(l => l.level === 'error').length}</span>
          <span>Erfolg: {logs.filter(l => l.level === 'success').length}</span>
          <span className="text-cyber-purple-400">API: {isConnected ? 'Verbunden' : 'Getrennt'}</span>
        </div>
      </div>

      {/* Logs Display */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-robot-gray-400"
            >
              <WifiOff className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-lg mb-2">Keine Verbindung zur Agent-API</p>
              <p className="text-sm">Stelle sicher, dass der Agent-Core läuft und über Port 8000 erreichbar ist</p>
              <button
                onClick={handleRefresh}
                className="cyber-button mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verbindung testen
              </button>
            </motion.div>
          ) : filteredLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-robot-gray-400"
            >
              <Filter className="w-12 h-12 mx-auto mb-4 text-robot-gray-500" />
              <p>Keine Logs entsprechen den aktuellen Filtern</p>
              <p className="text-xs mt-2">Versuche zu aktualisieren oder passe deine Suchkriterien an</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`log-entry ${getLevelColor(log.level)} bg-robot-gray-800 p-4 rounded-lg`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getLevelIcon(log.level)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-xs text-robot-gray-400">
                            {formatTime(log.timestamp)}
                          </span>
                          <span className="text-xs bg-robot-gray-700 px-2 py-1 rounded">
                            {log.source}
                          </span>
                          <span className="text-xs bg-robot-gray-700 px-2 py-1 rounded uppercase">
                            {log.level}
                          </span>
                        </div>
                        <p className="text-sm text-robot-gray-200">{log.message}</p>
                        {log.metadata && (
                          <div className="mt-2">
                            <details className="text-xs">
                              <summary className="cursor-pointer text-cyber-purple-400 hover:text-cyber-purple-300">
                                Metadaten
                              </summary>
                              <pre className="mt-2 p-2 bg-robot-gray-900 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-robot-gray-500 ml-4">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 p-2 bg-robot-gray-700 rounded border border-cyber-purple-500">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            <span className="text-robot-gray-400">
              {isConnected ? 'Echtzeit-Logging aktiv' : 'Verbindung getrennt'}
            </span>
          </div>
          <span className="text-robot-gray-400">
            Letzte Aktualisierung: {lastLogUpdate.toLocaleTimeString('de-DE')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default DevLogsTab
