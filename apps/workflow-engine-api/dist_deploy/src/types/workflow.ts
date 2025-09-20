export interface ModuleResult {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
    timestamp: string;
  };
}

export interface ModuleFunction {
  (input: any): Promise<ModuleResult>;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  configuration: any;
  position: { x: number; y: number };
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  type: string;
  configuration: any;
  position: any;
  onError: string;
  order: number;
  outputMode?: string;
  dependencies?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export const ExecutionStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED', 
  FAILED: 'FAILED',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED'
} as const;

export type ExecutionStatusType = typeof ExecutionStatus[keyof typeof ExecutionStatus];
