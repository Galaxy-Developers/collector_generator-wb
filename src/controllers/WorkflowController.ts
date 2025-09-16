import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { logger } from '../utils/logger';

export class WorkflowController {
  private prisma: PrismaClient;
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.prisma = new PrismaClient();
    // WorkflowEngine will be injected via dependency injection
  }

  async listWorkflows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const search = req.query.search as string;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [workflows, total] = await Promise.all([
        this.prisma.workflow.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: {
              select: { executions: true }
            }
          }
        }),
        this.prisma.workflow.count({ where })
      ]);

      res.json({
        workflows,
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

  async createWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, definition, priority } = req.body;
      
      const workflow = await this.prisma.workflow.create({
        data: {
          name,
          description,
          definition,
          priority
        }
      });

      logger.info(`Workflow created: ${workflow.id}`);
      res.status(201).json(workflow);
    } catch (error) {
      next(error);
    }
  }

  async getWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const workflow = await this.prisma.workflow.findUnique({
        where: { id },
        include: {
          steps: {
            include: { dependencies: true }
          },
          executions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true
            }
          }
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      res.json(workflow);
    } catch (error) {
      next(error);
    }
  }

  async updateWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const workflow = await this.prisma.workflow.update({
        where: { id },
        data: updates
      });

      logger.info(`Workflow updated: ${workflow.id}`);
      res.json(workflow);
    } catch (error) {
      next(error);
    }
  }

  async deleteWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.prisma.workflow.delete({
        where: { id }
      });

      logger.info(`Workflow deleted: ${id}`);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async executeWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { inputData = {} } = req.body;
      
      if (!this.workflowEngine) {
        return res.status(500).json({ error: 'Workflow engine not available' });
      }

      const executionId = await this.workflowEngine.createExecution(id, inputData);
      
      res.status(202).json({
        executionId,
        message: 'Workflow execution started'
      });
    } catch (error) {
      next(error);
    }
  }

  async validateWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const workflow = await this.prisma.workflow.findUnique({
        where: { id },
        include: { steps: { include: { dependencies: true } } }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Validation logic would go here
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      res.json(validationResult);
    } catch (error) {
      next(error);
    }
  }

  async duplicateWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      const originalWorkflow = await this.prisma.workflow.findUnique({
        where: { id },
        include: { steps: { include: { dependencies: true } } }
      });

      if (!originalWorkflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      const duplicatedWorkflow = await this.prisma.workflow.create({
        data: {
          name: name || `${originalWorkflow.name} (Copy)`,
          description: originalWorkflow.description,
          definition: originalWorkflow.definition,
          priority: originalWorkflow.priority
        }
      });

      res.status(201).json(duplicatedWorkflow);
    } catch (error) {
      next(error);
    }
  }

  async getWorkflowExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      
      const skip = (page - 1) * limit;
      const where: any = { workflowId: id };
      if (status) where.status = status;

      const [executions, total] = await Promise.all([
        this.prisma.workflowExecution.findMany({
          where,
          skip,
          take: limit,
          orderBy: { startedAt: 'desc' }
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
}
