import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class WorkflowController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAllWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const where = status ? { status } : {};
      const skip = (page - 1) * limit;

      const workflows = await this.prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        include: {
          steps: true,
          executions: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      const total = await this.prisma.workflow.count({ where });

      res.json({
        workflows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      logger.error('Failed to get workflows', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const workflow = await this.prisma.workflow.findUnique({
        where: { id },
        include: {
          steps: true,
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      res.json(workflow);
    } catch (error: any) {
      logger.error('Failed to get workflow', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, definition } = req.body;

      const workflow = await this.prisma.workflow.create({
        data: {
          name,
          description,
          definition: JSON.stringify(definition)
        }
      });

      res.status(201).json(workflow);
    } catch (error: any) {
      logger.error('Failed to create workflow', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, definition, status } = req.body;

      const workflow = await this.prisma.workflow.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(definition && { definition: JSON.stringify(definition) }),
          ...(status && { status })
        }
      });

      res.json(workflow);
    } catch (error: any) {
      logger.error('Failed to update workflow', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.prisma.workflow.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to delete workflow', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { inputData } = req.body;

      const workflow = await this.prisma.workflow.findUnique({
        where: { id }
      });

      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId: id,
          inputData: JSON.stringify(inputData || {})
        }
      });

      res.json(execution);
    } catch (error: any) {
      logger.error('Failed to execute workflow', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
