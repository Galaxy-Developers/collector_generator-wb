export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  definition: any;
  status: WorkflowStatus;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  inputData: any;
  outputData?: any;
  errorMessage?: string;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  type: string;
  configuration: any;
  position: { x: number; y: number };
  status: ExecutionStatus;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  onError: 'stop' | 'continue';
  onComplete: 'continue' | 'return';
  dependencies: WorkflowStepDependency[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStepDependency {
  id: string;
  stepId: string;
  dependsOnStepId: string;
  outputKey?: string;
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED'
}

export interface ModuleFunction {
  (config: any, inputData?: any): Promise<any>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}
