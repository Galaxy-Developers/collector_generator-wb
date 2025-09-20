import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer;

  private constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  public static initialize(io: SocketIOServer): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(io);
    }
    return SocketService.instance;
  }

  public static getInstance(): SocketService {
    return SocketService.instance;
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(\`Client connected: \${socket.id}\`);

      socket.on('disconnect', () => {
        logger.info(\`Client disconnected: \${socket.id}\`);
      });
    });
  }

  public emitProgress(executionId: string, message: string): void {
    this.io.emit('execution:progress', { executionId, message });
  }

  public emitStepProgress(executionId: string, stepData: any): void {
    this.io.emit('execution:step', { executionId, stepData });
  }

  public emitError(executionId: string, error: string): void {
    this.io.emit('execution:error', { executionId, error });
  }

  public emitCompleted(executionId: string, result: any): void {
    this.io.emit('execution:completed', { executionId, result });
  }
}
