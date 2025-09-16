import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { logger } from '../utils/logger';

export class ExecutionController {
  private prisma: PrismaClient;
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async listExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const workflowId = req.query.workflowId as string;
      
      const skip = (page - 1) * limit;
      const where: any = {};
      
      if (status) where.status = status;
      if (workflowId) where.workflowId = workflowId;

      const [executions, total] = await Promise.all([
        this.prisma.workflowExecution.findMany({
          where,
          skip,
          take: limit,
          orderBy: { startedAt: 'desc' },
          include: {
            workflow: {
              select: { name: true }
            }
          }
        }),
        this.prisma.workflowExecution.count({ where })
      ]);

      res.json({
        executions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id },
        include: {
          workflow: true,
          stepExecutions: {
            include: {
              step: true
            },
            orderBy: { startedAt: 'asc' }
          }
        }
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      res.json(execution);
    } catch (error) {
      next(error);
    }
  }

  async pauseExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!this.workflowEngine) {
        return res.status(500).json({ error: 'Workflow engine not available' });
      }

      await this.workflowEngine.pauseExecution(id);
      
      logger.info(`Execution paused: ${id}`);
      res.json({ message: 'Execution paused successfully' });
    } catch (error) {
      next(error);
    }
  }

  async resumeExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!this.workflowEngine) {
        return res.status(500).json({ error: 'Workflow engine not available' });
      }

      await this.workflowEngine.resumeExecution(id);
      
      logger.info(`Execution resumed: ${id}`);
      res.json({ message: 'Execution resumed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async stopExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!this.workflowEngine) {
        return res.status(500).json({ error: 'Workflow engine not available' });
      }

      await this.workflowEngine.stopExecution(id);
      
      logger.info(`Execution stopped: ${id}`);
      res.json({ message: 'Execution stopped successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getExecutionLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const level = req.query.level as string;

      // Mock implementation - in real app would query log storage
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Execution ${id} started`,
          metadata: {}
        }
      ];

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: logs.length,
          pages: 1
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getExecutionSteps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const stepExecutions = await this.prisma.workflowStepExecution.findMany({
        where: { executionId: id },
        include: {
          step: true
        },
        orderBy: { startedAt: 'asc' }
      });

      res.json(stepExecutions);
    } catch (error) {
      next(error);
    }
  }

  async retryStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, stepId } = req.params;
      
      // Implementation would retry the specific step
      logger.info(`Retrying step ${stepId} for execution ${id}`);
      
      res.json({ message: 'Step retry initiated' });
    } catch (error) {
      next(error);
    }
  }
}
