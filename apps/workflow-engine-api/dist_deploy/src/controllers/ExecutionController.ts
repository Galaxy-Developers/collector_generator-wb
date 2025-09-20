import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class ExecutionController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAllExecutions(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const where = status ? { status } : {};
      const skip = (page - 1) * limit;

      const executions = await this.prisma.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        include: {
          workflow: true,
          stepExecutions: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await this.prisma.workflowExecution.count({ where });

      res.json({
        executions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      logger.error('Failed to get executions', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getExecutionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id },
        include: {
          workflow: true,
          stepExecutions: {
            include: {
              step: true
            }
          }
        }
      });

      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      res.json(execution);
    } catch (error: any) {
      logger.error('Failed to get execution', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async pauseExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const execution = await this.prisma.workflowExecution.update({
        where: { id },
        data: { status: 'PAUSED' }
      });

      res.json(execution);
    } catch (error: any) {
      logger.error('Failed to pause execution', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resumeExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const execution = await this.prisma.workflowExecution.update({
        where: { id },
        data: { status: 'RUNNING' }
      });

      res.json(execution);
    } catch (error: any) {
      logger.error('Failed to resume execution', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async stopExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const execution = await this.prisma.workflowExecution.update({
        where: { id },
        data: { 
          status: 'STOPPED',
          completedAt: new Date()
        }
      });

      res.json(execution);
    } catch (error: any) {
      logger.error('Failed to stop execution', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
