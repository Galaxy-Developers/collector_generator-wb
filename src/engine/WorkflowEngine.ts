import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class WorkflowEngine {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async executeWorkflow(workflowId: string, inputData?: any): Promise<any> {
    try {
      logger.info('Executing workflow: ' + workflowId);

      // Создаем execution
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId,
          status: 'RUNNING',
          startedAt: new Date(),
          inputData: JSON.stringify(inputData || {})
        }
      });

      // Mock execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Обновляем как завершенный
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          outputData: JSON.stringify({ result: 'Mock execution completed' })
        }
      });

      return execution;
    } catch (error: any) {
      logger.error('Workflow execution failed:', error);
      const errorMsg = error && error.message ? error.message : 'Unknown error';
      throw new Error('Execution failed: ' + errorMsg);
    }
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    return this.prisma.workflowExecution.findUnique({
      where: { id: executionId }
    });
  }
}
