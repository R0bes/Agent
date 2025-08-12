import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAgent } from '../../context/AgentContext'
import { Server, Cpu, Activity, Database, Network } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ConnectionStatus from '../ConnectionStatus'

const SystemInfoTab: React.FC = () => {
  const { systemInfo, refreshSystemInfo, isConnected } = useAgent()
  const [connectionHistory, setConnectionHistory] = useState<Array<{ time: string; status: boolean }>>([])
  const [toolUsage, setToolUsage] = useState<Array<{ name: string; count: number }>>([])

  // Track connection history
  useEffect(() => {
    if (connectionHistory.length === 0) {
      setConnectionHistory([{ time: new Date().toLocaleTimeString('de-DE'), status: isConnected }])
    } else {
      setConnectionHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString('de-DE'), status: isConnected }])
    }
  }, [isConnected])

  // Simulate tool usage data based on available tools
  useEffect(() => {
    if (systemInfo?.tools_available) {
      const tools = [
        'Code Executor', 'File Reader', 'Web Search', 'Data Analyzer', 
        'System Info', 'Log Access', 'File Writer'
      ]
      const usage = tools.slice(0, systemInfo.tools_available).map(tool => ({
        name: tool,
        count: Math.floor(Math.random() * 100) + 1
      }))
      setToolUsage(usage)
    }
  }, [systemInfo?.tools_available])

  const fsmStates = [
    { name: 'INIT', color: '#3b82f6', description: 'Initialisierung' },
    { name: 'PLANNING', color: '#8b5cf6', description: 'Aufgabenplanung' },
    { name: 'TOOL_EXECUTION', color: '#10b981', description: 'Tool-Ausführung' },
    { name: 'REFLECTION', color: '#f59e0b', description: 'Selbstreflexion' },
    { name: 'RESULT_SYNTHESIS', color: '#ef4444', description: 'Ergebnis-Synthese' },
  ]



  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Connection Status - Neue Komponente */}
      <ConnectionStatus 
        isConnected={isConnected}
        systemInfo={systemInfo}
        onRefresh={refreshSystemInfo}
      />

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          className="bg-robot-gray-700 p-4 rounded-lg border border-cyber-purple-500"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <Server className="w-8 h-8 text-cyber-purple-400" />
            <div>
              <p className="text-robot-gray-400 text-sm">System Status</p>
              <p className={`text-2xl font-bold ${systemInfo?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                {systemInfo?.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-robot-gray-700 p-4 rounded-lg border border-cyber-purple-500"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-cyber-blue-400" />
            <div>
              <p className="text-robot-gray-400 text-sm">Verfügbare Tools</p>
              <p className="text-2xl font-bold text-cyber-blue-400">{systemInfo?.tools_available || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-robot-gray-700 p-4 rounded-lg border border-cyber-purple-500"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <Network className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-robot-gray-400 text-sm">LLM Verbindung</p>
              <p className={`text-2xl font-bold ${systemInfo?.llm_connected ? 'text-green-400' : 'text-red-400'}`}>
                {systemInfo?.llm_connected ? 'AKTIV' : 'INAKTIV'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-robot-gray-700 p-4 rounded-lg border border-cyber-purple-500"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <Cpu className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-robot-gray-400 text-sm">Agent ID</p>
              <p className="text-lg font-bold text-yellow-400 font-mono">
                {systemInfo?.agent_id ? systemInfo.agent_id.slice(0, 8) + '...' : 'N/A'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Connection History Chart */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h3 className="text-xl font-bold text-cyber-purple-400 mb-4">📊 Verbindungsverlauf</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={connectionHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
                domain={[0, 1]}
                tickFormatter={(value) => value === 1 ? 'Verbunden' : 'Getrennt'}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #8b5cf6',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [value === 1 ? 'Verbunden' : 'Getrennt', 'Status']}
              />
              <Line 
                type="monotone" 
                dataKey="status" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FSM State Machine Visualization */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h3 className="text-xl font-bold text-cyber-purple-400 mb-4">🧠 Finite State Machine</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* State Flow Diagram */}
          <div>
            <h4 className="text-lg font-semibold text-robot-gray-300 mb-4">Zustandsfluss</h4>
            <div className="space-y-3">
              {fsmStates.map((state, index) => (
                <motion.div
                  key={state.name}
                  className="flex items-center space-x-3 p-3 bg-robot-gray-800 rounded border-l-4"
                  style={{ borderLeftColor: state.color }}
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: state.color }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-sm font-bold" style={{ color: state.color }}>
                      {state.name}
                    </div>
                    <div className="text-xs text-robot-gray-400">{state.description}</div>
                  </div>
                  {index < fsmStates.length - 1 && (
                    <div className="text-robot-gray-500">→</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tool Usage Chart */}
          <div>
            <h4 className="text-lg font-semibold text-robot-gray-300 mb-4">Tool-Nutzung</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={toolUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {toolUsage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 60%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Information */}
      <div className="bg-robot-gray-700 p-6 rounded-lg border border-cyber-purple-500">
        <h4 className="text-lg font-semibold text-robot-gray-300 mb-4">Agent Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-robot-gray-400 text-sm">Agent ID</p>
            <p className="font-mono text-cyber-purple-400 break-all">{systemInfo?.agent_id || 'Nicht verfügbar'}</p>
          </div>
          <div>
            <p className="text-robot-gray-400 text-sm">System Status</p>
            <p className={`text-sm font-semibold ${systemInfo?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
              {systemInfo?.status === 'healthy' ? 'Gesund' : 'Fehlerhaft'}
            </p>
          </div>
          <div>
            <p className="text-robot-gray-400 text-sm">LLM Verbindung</p>
            <p className={`text-sm font-semibold ${systemInfo?.llm_connected ? 'text-green-400' : 'text-red-400'}`}>
              {systemInfo?.llm_connected ? 'Verbunden' : 'Nicht verbunden'}
            </p>
          </div>
          <div>
            <p className="text-robot-gray-400 text-sm">Verfügbare Tools</p>
            <p className="text-cyber-purple-400 font-semibold">{systemInfo?.tools_available || 0} Tools</p>
          </div>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={refreshSystemInfo}
            className="cyber-button"
          >
            <Activity className="w-4 h-4 mr-2" />
            System-Info aktualisieren
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemInfoTab
