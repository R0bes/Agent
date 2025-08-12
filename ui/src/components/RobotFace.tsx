import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAgent } from '../context/AgentContext'

const RobotFace: React.FC = () => {
  const { isConnected, isProcessing, systemInfo } = useAgent()
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 })
  const [mouthExpression, setMouthExpression] = useState('neutral')

  // Simulate eye movement
  useEffect(() => {
    const interval = setInterval(() => {
      setEyePosition({
        x: Math.random() * 20 - 10,
        y: Math.random() * 10 - 5
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Update mouth expression based on processing state
  useEffect(() => {
    if (isProcessing) {
      setMouthExpression('processing')
    } else if (isConnected) {
      setMouthExpression('happy')
    } else {
      setMouthExpression('sad')
    }
  }, [isProcessing, isConnected])

  const getMouthPath = () => {
    switch (mouthExpression) {
      case 'happy':
        return 'M 20 60 Q 40 80 60 60'
      case 'sad':
        return 'M 20 80 Q 40 60 60 80'
      case 'processing':
        return 'M 20 70 Q 40 90 60 70'
      default:
        return 'M 20 70 Q 40 70 60 70'
    }
  }

  return (
    <motion.div 
      className="robot-screen p-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-cyber-purple-400 mb-2">🤖 Neural Interface</h2>
        <div className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          {isConnected ? '● ONLINE' : '● OFFLINE'}
        </div>
      </div>

      {/* Robot Face */}
      <div className="relative bg-robot-gray-700 rounded-full w-48 h-48 mx-auto mb-6 border-2 border-cyber-purple-500">
        {/* Scan line effect */}
        <div className="scan-line" />
        
        {/* Eyes */}
        <div className="absolute top-16 left-12 w-6 h-6 bg-cyber-purple-400 rounded-full overflow-hidden">
          <motion.div 
            className="w-2 h-2 bg-robot-gray-900 rounded-full"
            animate={{ x: eyePosition.x, y: eyePosition.y }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="absolute top-16 right-12 w-6 h-6 bg-cyber-purple-400 rounded-full overflow-hidden">
          <motion.div 
            className="w-2 h-2 bg-robot-gray-900 rounded-full"
            animate={{ x: eyePosition.x, y: eyePosition.y }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Mouth */}
        <svg className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-16 h-8">
          <motion.path
            d={getMouthPath()}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-cyber-purple-400"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div 
            className="absolute inset-0 bg-cyber-purple-500 opacity-20 rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Status Indicators */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-robot-gray-400 text-sm">LLM Status:</span>
          <span className={`text-sm ${systemInfo?.llm_connected ? 'text-green-400' : 'text-red-400'}`}>
            {systemInfo?.llm_connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-robot-gray-400 text-sm">Tools Available:</span>
          <span className="text-cyber-purple-400 text-sm">
            {systemInfo?.tools_available || 0}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-robot-gray-400 text-sm">Agent ID:</span>
          <span className="text-cyber-purple-400 text-xs font-mono">
            {systemInfo?.agent_id?.slice(0, 8) || 'N/A'}
          </span>
        </div>

        {isProcessing && (
          <motion.div 
            className="bg-cyber-purple-600 text-white text-center py-2 rounded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Processing...
          </motion.div>
        )}
      </div>

      {/* System Status */}
      <div className="mt-4 p-3 bg-robot-gray-700 rounded border border-cyber-purple-500">
        <div className="text-xs text-robot-gray-400 mb-2">System Status</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-xs text-robot-gray-400">CPU:</span>
            <span className="text-xs text-cyber-purple-400">42%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-robot-gray-400">Memory:</span>
            <span className="text-xs text-cyber-purple-400">1.2GB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-robot-gray-400">Network:</span>
            <span className="text-xs text-green-400">Active</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default RobotFace
