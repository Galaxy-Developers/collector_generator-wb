import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';
import { SocketService } from './services/SocketService';
import workflowRoutes from './routes/workflows';
import executionRoutes from './routes/executions';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, '../public')));

// Initialize socket service
SocketService.initialize(io);

// API Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    message: 'Workflow Engine API работает',
    endpoints: {
      dashboard: 'http://localhost:3000',
      health: 'http://localhost:3000/health',
      workflows: 'http://localhost:3000/api/workflows',
      executions: 'http://localhost:3000/api/executions'
    }
  });
});

// Главная страница - редирект на интерфейс
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: 'Откройте http://localhost:3000 для веб интерфейса',
    availableEndpoints: {
      'Dashboard': '/',
      'Health Check': '/health', 
      'API Workflows': '/api/workflows',
      'API Executions': '/api/executions'
    }
  });
});

// Error handling
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error?.message || 'Unknown error'
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('🚀 ==========================================');
  console.log('🎯 WORKFLOW ENGINE API ЗАПУЩЕН!');
  console.log('🚀 ==========================================');
  console.log('');
  console.log('📊 Dashboard:     http://localhost:' + PORT);
  console.log('🔍 Health Check:  http://localhost:' + PORT + '/health');
  console.log('📡 API:           http://localhost:' + PORT + '/api');
  console.log('');
  console.log('✅ Все готово! Открывайте браузер!');
  console.log('');

  logger.info('Workflow Engine API started on port ' + PORT);
});
