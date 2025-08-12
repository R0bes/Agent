import React, { useState } from 'react'
import { motion } from 'framer-motion'
import RobotFace from './components/RobotFace'
import ChatTab from './components/tabs/ChatTab'
import SystemInfoTab from './components/tabs/SystemInfoTab'
import ReasoningTab from './components/tabs/ReasoningTab'
import DevLogsTab from './components/tabs/DevLogsTab'
import { AgentProvider } from './context/AgentContext'

type TabType = 'chat' | 'system' | 'reasoning' | 'devlogs'

interface TabConfig {
  id: TabType
  label: string
  component: React.ComponentType
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat')

  const tabs: TabConfig[] = [
    { id: 'chat', label: '🤖 Chat', component: ChatTab },
    { id: 'system', label: '⚙️ System Info', component: SystemInfoTab },
    { id: 'reasoning', label: '🧠 Internal Reasoning', component: ReasoningTab },
    { id: 'devlogs', label: '📊 Dev Logs', component: DevLogsTab },
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <AgentProvider>
      <div className="min-h-screen bg-gradient-to-br from-robot-gray-900 via-robot-gray-800 to-robot-gray-900">
        {/* Header */}
        <motion.header 
          className="bg-robot-gray-800 border-b-2 border-cyber-purple-500 p-4"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🤖</div>
              <div>
                <h1 className="text-2xl font-bold text-cyber-purple-400">Agent Control Center</h1>
                <p className="text-robot-gray-400 text-sm">Neural Network Interface v2.0</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-cyber-purple-400 text-sm">
                <span className="animate-pulse">●</span> ONLINE
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Robot Face Panel */}
            <motion.div 
              className="lg:col-span-1"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <RobotFace />
            </motion.div>

            {/* Main Interface */}
            <motion.div 
              className="lg:col-span-3"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="robot-screen">
                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`robot-tab ${activeTab === tab.id ? 'active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[600px]">
                  {ActiveComponent && <ActiveComponent />}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AgentProvider>
  )
}

export default App
