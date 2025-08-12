# 🤖 Agent Control Center UI

A modern, robot-themed React interface for the AI Agent system with real-time monitoring and interaction capabilities.

## Features

- **🤖 Robot Face Display**: Animated robot face with real-time status indicators
- **💬 Chat Interface**: Interactive chat with the AI agent
- **⚙️ System Information**: Real-time system metrics and FSM visualization
- **🧠 Internal Reasoning**: Step-by-step reasoning process visualization
- **📊 Development Logs**: Comprehensive logging with filtering and export

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **Lucide React** for icons

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The UI will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Docker

The UI can be run with Docker Compose:

```bash
docker-compose up agent-ui
```

Or build and run the entire stack:

```bash
docker-compose up
```

## API Integration

The UI communicates with the agent API through the `/api` proxy endpoint. Make sure the agent API is running on port 8000.

## Design Features

- **Cyberpunk/Robot Theme**: Purple and blue color scheme with glowing effects
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live status indicators and metrics
- **Smooth Animations**: Framer Motion powered transitions
- **Dark Mode**: Optimized for low-light environments

## Tabs Overview

### 1. Chat Tab
- Interactive chat interface with the AI agent
- Real-time message history
- Processing indicators

### 2. System Info Tab
- FSM state machine visualization
- Real-time CPU and memory charts
- System status indicators
- Agent information display

### 3. Internal Reasoning Tab
- Step-by-step reasoning process
- Neural network activity visualization
- Confidence indicators
- Thought process timeline

### 4. Dev Logs Tab
- Comprehensive logging system
- Filter by level and source
- Search functionality
- Export capabilities
- Real-time log updates

## Configuration

The UI can be configured through environment variables:

- `VITE_API_URL`: API endpoint (default: `/api`)
- `VITE_APP_TITLE`: Application title (default: "Agent Control Center")

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
