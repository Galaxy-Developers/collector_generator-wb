import { Server, Socket } from 'socket.io';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export class SocketService {
  private io: Server;
  private workflowEngine: WorkflowEngine;
  private userSockets = new Map<string, Set<Socket>>();

  constructor(io: Server, workflowEngine: WorkflowEngine) {
    this.io = io;
    this.workflowEngine = workflowEngine;
  }

  initialize(): void {
    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.userId = decoded.userId;
        socket.data.userRole = decoded.role;
        
        logger.info(`Socket authenticated for user: ${decoded.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.IO service initialized');
  }

  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId;
    
    logger.info(`User connected: ${userId} (${socket.id})`);

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle socket events
    this.setupSocketHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId} (${socket.id})`);
      
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });
  }

  private setupSocketHandlers(socket: Socket): void {
    const userId = socket.data.userId;

    // Subscribe to workflow execution updates
    socket.on('subscribe:execution', (executionId: string) => {
      socket.join(`execution:${executionId}`);
      logger.info(`User ${userId} subscribed to execution: ${executionId}`);
    });

    // Unsubscribe from workflow execution updates
    socket.on('unsubscribe:execution', (executionId: string) => {
      socket.leave(`execution:${executionId}`);
      logger.info(`User ${userId} unsubscribed from execution: ${executionId}`);
    });

    // Subscribe to workflow updates
    socket.on('subscribe:workflow', (workflowId: string) => {
      socket.join(`workflow:${workflowId}`);
      logger.info(`User ${userId} subscribed to workflow: ${workflowId}`);
    });

    // Unsubscribe from workflow updates
    socket.on('unsubscribe:workflow', (workflowId: string) => {
      socket.leave(`workflow:${workflowId}`);
      logger.info(`User ${userId} unsubscribed from workflow: ${workflowId}`);
    });

    // Get real-time execution status
    socket.on('get:execution:status', async (executionId: string) => {
      try {
        const execution = await this.workflowEngine.getExecutionStatus(executionId);
        socket.emit('execution:status', { executionId, execution });
      } catch (error) {
        socket.emit('error', { message: 'Failed to get execution status', executionId });
      }
    });

    // Request execution logs stream
    socket.on('stream:logs', (executionId: string) => {
      this.streamExecutionLogs(socket, executionId);
    });

    // Stop logs stream
    socket.on('stop:logs', (executionId: string) => {
      socket.leave(`logs:${executionId}`);
    });
  }

  // Public methods for emitting events

  emitExecutionStarted(executionId: string, data: any): void {
    this.io.to(`execution:${executionId}`).emit('execution:started', {
      executionId,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitExecutionProgress(executionId: string, progress: any): void {
    this.io.to(`execution:${executionId}`).emit('execution:progress', {
      executionId,
      ...progress,
      timestamp: new Date().toISOString()
    });
  }

  emitExecutionCompleted(executionId: string, result: any): void {
    this.io.to(`execution:${executionId}`).emit('execution:completed', {
      executionId,
      result,
      timestamp: new Date().toISOString()
    });
  }

  emitExecutionFailed(executionId: string, error: any): void {
    this.io.to(`execution:${executionId}`).emit('execution:failed', {
      executionId,
      error,
      timestamp: new Date().toISOString()
    });
  }

  emitExecutionPaused(executionId: string): void {
    this.io.to(`execution:${executionId}`).emit('execution:paused', {
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  emitExecutionResumed(executionId: string): void {
    this.io.to(`execution:${executionId}`).emit('execution:resumed', {
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  emitExecutionStopped(executionId: string): void {
    this.io.to(`execution:${executionId}`).emit('execution:stopped', {
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  emitStepStarted(executionId: string, stepData: any): void {
    this.io.to(`execution:${executionId}`).emit('step:started', {
      executionId,
      ...stepData,
      timestamp: new Date().toISOString()
    });
  }

  emitStepProgress(executionId: string, stepData: any): void {
    this.io.to(`execution:${executionId}`).emit('step:progress', {
      executionId,
      ...stepData,
      timestamp: new Date().toISOString()
    });
  }

  emitStepCompleted(executionId: string, stepData: any): void {
    this.io.to(`execution:${executionId}`).emit('step:completed', {
      executionId,
      ...stepData,
      timestamp: new Date().toISOString()
    });
  }

  emitStepFailed(executionId: string, stepData: any): void {
    this.io.to(`execution:${executionId}`).emit('step:failed', {
      executionId,
      ...stepData,
      timestamp: new Date().toISOString()
    });
  }

  emitWorkflowUpdated(workflowId: string, data: any): void {
    this.io.to(`workflow:${workflowId}`).emit('workflow:updated', {
      workflowId,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitSystemNotification(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system:notification', {
      message,
      level,
      timestamp: new Date().toISOString()
    });
  }

  private async streamExecutionLogs(socket: Socket, executionId: string): Promise<void> {
    socket.join(`logs:${executionId}`);
    
    // Implementation would connect to log streaming service
    // For now, simulate real-time logs
    const logInterval = setInterval(() => {
      if (socket.rooms.has(`logs:${executionId}`)) {
        socket.emit('logs:data', {
          executionId,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Processing step in execution ${executionId}`,
          metadata: {}
        });
      } else {
        clearInterval(logInterval);
      }
    }, 1000);
  }

  // Utility methods
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  getTotalConnections(): number {
    return this.io.engine.clientsCount;
  }

  getActiveRooms(): string[] {
    return Array.from(this.io.sockets.adapter.rooms.keys());
  }
}
