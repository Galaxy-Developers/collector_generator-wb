import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import Queue from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { logger } from '../utils/logger';
import { 
  WorkflowDefinition, 
  WorkflowExecution, 
  WorkflowStep, 
  ExecutionStatus 
} from '../types/workflow';
import { TopologicalSorter } from '../utils/topologicalSort';
import { ModuleRegistry } from './ModuleRegistry';

export class WorkflowEngine {
  private prisma: PrismaClient;
  private io: Server;
  private executionQueue: Queue.Queue;
  private moduleRegistry: ModuleRegistry;
  private topologicalSorter: TopologicalSorter;

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma;
    this.io = io;
    this.moduleRegistry = new ModuleRegistry();
    this.topologicalSorter = new TopologicalSorter();
    
    // Initialize Bull queue
    this.executionQueue = new Queue('workflow execution', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupQueueProcessing();
    this.registerDefaultModules();
  }

  private setupQueueProcessing(): void {
    this.executionQueue.process('execute-workflow', 5, async (job) => {
      const { executionId, workflowId, inputData } = job.data;
      return this.executeWorkflowSteps(executionId, workflowId, inputData);
    });

    this.executionQueue.on('completed', (job, result) => {
      logger.info(`Workflow execution completed: ${job.data.executionId}`);
      this.io.emit('execution:completed', { 
        executionId: job.data.executionId, 
        result 
      });
    });

    this.executionQueue.on('failed', (job, err) => {
      logger.error(`Workflow execution failed: ${job.data.executionId}`, err);
      this.io.emit('execution:failed', { 
        executionId: job.data.executionId, 
        error: err.message 
      });
    });
  }

  private registerDefaultModules(): void {
    // Register Wildberries SDK modules
    this.moduleRegistry.register('wb-get-campaigns', async (config: any) => {
      const { DefaultApi } = await import('@galaxy-wb-sdk/promotion');
      const api = new DefaultApi();
      // Implementation will use real WB SDK
      return api.getCampaigns(config);
    });

    this.moduleRegistry.register('wb-get-stats', async (config: any) => {
      const { DefaultApi } = await import('@galaxy-wb-sdk/analytics');
      const api = new DefaultApi();
      return api.getStatistics(config);
    });

    // Register data processing modules
    this.moduleRegistry.register('data-filter', async (config: any, inputData: any) => {
      const { filters } = config;
      return inputData.filter((item: any) => {
        return filters.every((filter: any) => {
          const { field, operator, value } = filter;
          switch (operator) {
            case 'equals': return item[field] === value;
            case 'contains': return item[field]?.includes(value);
            case 'gt': return item[field] > value;
            case 'lt': return item[field] < value;
            case 'in': return value.includes(item[field]);
            default: return true;
          }
        });
      });
    });

    this.moduleRegistry.register('metric-calculator', async (config: any, inputData: any) => {
      const { calculations } = config;
      return inputData.map((item: any) => {
        const calculatedItem = { ...item };
        calculations.forEach((calc: any) => {
          try {
            // Safe evaluation of mathematical expressions
            calculatedItem[calc.name] = eval(calc.formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, 
              (match: string) => item[match] || 0));
          } catch (error) {
            logger.error(`Calculation error for ${calc.name}:`, error);
            calculatedItem[calc.name] = null;
          }
        });
        return calculatedItem;
      });
    });
  }

  async createExecution(workflowId: string, inputData: any): Promise<string> {
    try {
      // Get workflow definition
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: true }
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Create execution record
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId,
          status: ExecutionStatus.PENDING,
          inputData,
          startedAt: new Date()
        }
      });

      // Queue for execution
      await this.executionQueue.add('execute-workflow', {
        executionId: execution.id,
        workflowId,
        inputData
      }, {
        priority: workflow.priority || 0
      });

      logger.info(`Workflow execution queued: ${execution.id}`);
      
      this.io.emit('execution:started', {
        executionId: execution.id,
        workflowId,
        status: ExecutionStatus.PENDING
      });

      return execution.id;
    } catch (error) {
      logger.error('Failed to create workflow execution:', error);
      throw error;
    }
  }

  private async executeWorkflowSteps(
    executionId: string, 
    workflowId: string, 
    inputData: any
  ): Promise<any> {
    try {
      // Update execution status
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: ExecutionStatus.RUNNING }
      });

      // Get workflow steps with dependencies
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { 
          steps: {
            include: { dependencies: true }
          }
        }
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Create dependency graph
      const dependencyGraph = new Map<string, string[]>();
      workflow.steps.forEach(step => {
        dependencyGraph.set(step.id, step.dependencies.map(dep => dep.dependsOnStepId));
      });

      // Sort steps topologically
      const sortedStepIds = this.topologicalSorter.sort(dependencyGraph);
      const stepMap = new Map(workflow.steps.map(step => [step.id, step]));

      let currentData = inputData;
      const stepResults = new Map<string, any>();

      // Execute steps in topological order
      for (const stepId of sortedStepIds) {
        const step = stepMap.get(stepId);
        if (!step) continue;

        this.io.emit('step:started', {
          executionId,
          stepId: step.id,
          stepName: step.name
        });

        try {
          // Execute step
          const stepResult = await this.executeStep(step, currentData, stepResults);
          stepResults.set(step.id, stepResult);

          // Update step execution record
          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: ExecutionStatus.COMPLETED,
              outputData: stepResult,
              completedAt: new Date()
            }
          });

          this.io.emit('step:completed', {
            executionId,
            stepId: step.id,
            stepName: step.name,
            result: stepResult
          });

          // Use step output as input for next step if no other dependencies
          if (step.outputMode === 'pass-through') {
            currentData = stepResult;
          }

        } catch (error) {
          logger.error(`Step execution failed: ${step.name}`, error);
          
          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: ExecutionStatus.FAILED,
              errorMessage: error.message,
              completedAt: new Date()
            }
          });

          this.io.emit('step:failed', {
            executionId,
            stepId: step.id,
            stepName: step.name,
            error: error.message
          });

          // Handle error based on step configuration
          if (step.onError === 'continue') {
            logger.info(`Continuing execution despite step failure: ${step.name}`);
            continue;
          } else {
            throw error;
          }
        }
      }

      // Mark execution as completed
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          outputData: currentData,
          completedAt: new Date()
        }
      });

      logger.info(`Workflow execution completed: ${executionId}`);
      return currentData;

    } catch (error) {
      logger.error(`Workflow execution failed: ${executionId}`, error);
      
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: error.message,
          completedAt: new Date()
        }
      });

      throw error;
    }
  }

  private async executeStep(
    step: any, 
    inputData: any, 
    stepResults: Map<string, any>
  ): Promise<any> {
    const module = this.moduleRegistry.getModule(step.type);
    if (!module) {
      throw new Error(`Unknown step type: ${step.type}`);
    }

    // Prepare step input data
    let stepInputData = inputData;
    
    // If step has dependencies, merge their outputs
    if (step.dependencies?.length > 0) {
      stepInputData = {};
      step.dependencies.forEach((dep: any) => {
        const depResult = stepResults.get(dep.dependsOnStepId);
        if (depResult) {
          stepInputData[dep.outputKey || 'data'] = depResult;
        }
      });
    }

    // Execute the module
    const result = await module(step.configuration, stepInputData);
    
    return result;
  }

  async pauseExecution(executionId: string): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.PAUSED }
    });
    
    this.io.emit('execution:paused', { executionId });
  }

  async resumeExecution(executionId: string): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.RUNNING }
    });
    
    this.io.emit('execution:resumed', { executionId });
  }

  async stopExecution(executionId: string): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { 
        status: ExecutionStatus.STOPPED,
        completedAt: new Date()
      }
    });
    
    this.io.emit('execution:stopped', { executionId });
  }
}
