import { Router } from 'express';
import { param, query } from 'express-validator';
import { ExecutionController } from '../controllers/ExecutionController';
import { validate } from '../middleware/validation';

const router = Router();
const executionController = new ExecutionController();

// GET /api/v1/executions - List all executions
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'STOPPED']),
  query('workflowId').optional().isUUID(),
  validate,
  executionController.listExecutions.bind(executionController)
);

// GET /api/v1/executions/:id - Get execution by ID
router.get('/:id',
  param('id').isUUID(),
  validate,
  executionController.getExecution.bind(executionController)
);

// POST /api/v1/executions/:id/pause - Pause execution
router.post('/:id/pause',
  param('id').isUUID(),
  validate,
  executionController.pauseExecution.bind(executionController)
);

// POST /api/v1/executions/:id/resume - Resume execution
router.post('/:id/resume',
  param('id').isUUID(),
  validate,
  executionController.resumeExecution.bind(executionController)
);

// POST /api/v1/executions/:id/stop - Stop execution
router.post('/:id/stop',
  param('id').isUUID(),
  validate,
  executionController.stopExecution.bind(executionController)
);

// GET /api/v1/executions/:id/logs - Get execution logs
router.get('/:id/logs',
  param('id').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
  validate,
  executionController.getExecutionLogs.bind(executionController)
);

// GET /api/v1/executions/:id/steps - Get execution steps
router.get('/:id/steps',
  param('id').isUUID(),
  validate,
  executionController.getExecutionSteps.bind(executionController)
);

// POST /api/v1/executions/:id/steps/:stepId/retry - Retry failed step
router.post('/:id/steps/:stepId/retry',
  param('id').isUUID(),
  param('stepId').isUUID(),
  validate,
  executionController.retryStep.bind(executionController)
);

export { router as executionRoutes };
