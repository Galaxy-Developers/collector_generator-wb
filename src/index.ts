import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { workflowRoutes } from './routes/workflows';
import { executionRoutes } from './routes/executions';
import { WorkflowEngine } from './engine/WorkflowEngine';
import { SocketService } from './services/SocketService';

config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const workflowEngine = new WorkflowEngine(prisma, io);
const socketService = new SocketService(io, workflowEngine);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1/workflows', authMiddleware, workflowRoutes);
app.use('/api/v1/executions', authMiddleware, executionRoutes);

// Error handling
app.use(errorHandler);

// Socket.IO connection handling
socketService.initialize();

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`🚀 Workflow Engine API running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});