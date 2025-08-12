import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { WifiOff, Wifi, AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  systemInfo: any
  onRefresh: () => void
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, systemInfo, onRefresh }) => {
  const [lastCheck, setLastCheck] = useState<Date>(new Date())
  const [checking, setChecking] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    try {
      await onRefresh()
    } finally {
      setChecking(false)
      setLastCheck(new Date())
    }
  }

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-400'
    if (systemInfo?.status === 'healthy') return 'text-green-400'
    return 'text-yellow-400'
  }

  const getStatusIcon = () => {
    if (!isConnected) return <WifiOff className="w-5 h-5" />
    if (systemInfo?.status === 'healthy') return <Wifi className="w-5 h-5" />
    return <AlertTriangle className="w-5 h-5" />
  }

  const getConnectionText = () => {
    if (!isConnected) return 'Nicht verbunden'
    if (systemInfo?.status === 'healthy') return 'Verbunden'
    return 'Teilweise verbunden'
  }

  return (
    <motion.div 
      className="bg-robot-gray-700 p-4 rounded-lg border border-cyber-purple-500"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-cyber-purple-400">🔌 Verbindungsstatus</h3>
        <button
          onClick={handleRefresh}
          disabled={checking}
          className="cyber-button-small"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Prüfe...' : 'Aktualisieren'}
        </button>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-3 p-3 bg-robot-gray-800 rounded border-l-4 border-cyber-purple-500">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <div>
            <p className="text-sm text-robot-gray-400">Status</p>
            <p className={`font-semibold ${getStatusColor()}`}>
              {getConnectionText()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-3 bg-robot-gray-800 rounded border-l-4 border-cyber-purple-500">
          <div className={systemInfo?.llm_connected ? 'text-green-400' : 'text-red-400'}>
            {systemInfo?.llm_connected ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm text-robot-gray-400">LLM Verbindung</p>
            <p className={`font-semibold ${systemInfo?.llm_connected ? 'text-green-400' : 'text-red-400'}`}>
              {systemInfo?.llm_connected ? 'Verbunden' : 'Nicht verbunden'}
            </p>
          </div>
        </div>
      </div>

      {/* API Endpoints Status */}
      <div className="mb-4">
        <h4 className="text-md font-semibold text-robot-gray-300 mb-3">API Endpoints</h4>
        <div className="space-y-2">
          {[
            { name: 'Health Check', endpoint: '/api/health', status: isConnected && systemInfo?.status === 'healthy' },
            { name: 'Think API', endpoint: '/api/think', status: isConnected },
            { name: 'Logs API', endpoint: '/api/logs', status: isConnected }
          ].map((api, index) => (
            <motion.div
              key={index}
              className="flex items-center justify-between p-2 bg-robot-gray-800 rounded"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${api.status ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-sm text-robot-gray-300">{api.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <code className="text-xs text-robot-gray-400 font-mono">{api.endpoint}</code>
                <span className={`text-xs px-2 py-1 rounded ${api.status ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {api.status ? 'OK' : 'FEHLER'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* System Details */}
      {systemInfo && (
        <div className="border-t border-robot-gray-600 pt-4">
          <h4 className="text-md font-semibold text-robot-gray-300 mb-3">System Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-robot-gray-400">Agent ID</p>
              <p className="font-mono text-cyber-purple-400">{systemInfo.agent_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-robot-gray-400">Verfügbare Tools</p>
              <p className="text-cyber-blue-400">{systemInfo.tools_available || 0}</p>
            </div>
            <div>
              <p className="text-robot-gray-400">Letzte Prüfung</p>
              <p className="text-robot-gray-300">{lastCheck.toLocaleTimeString('de-DE')}</p>
            </div>
            <div>
              <p className="text-robot-gray-400">Status Code</p>
              <p className={`font-semibold ${systemInfo.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>
                {systemInfo.status || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection History */}
      <div className="mt-4 p-3 bg-robot-gray-800 rounded">
        <div className="flex items-center justify-between text-xs text-robot-gray-400">
          <span>Verbindungsverlauf</span>
          <span>Letzte Aktualisierung: {lastCheck.toLocaleTimeString('de-DE')}</span>
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-robot-gray-300">
            {isConnected ? 'Verbindung aktiv' : 'Verbindung getrennt'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default ConnectionStatus
