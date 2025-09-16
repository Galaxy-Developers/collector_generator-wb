import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WorkflowController } from '../controllers/WorkflowController';
import { validate } from '../middleware/validation';

const router = Router();
const workflowController = new WorkflowController();

// GET /api/v1/workflows - List all workflows
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  query('search').optional().isString(),
  validate,
  workflowController.listWorkflows.bind(workflowController)
);

// POST /api/v1/workflows - Create new workflow
router.post('/',
  body('name').notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('definition').isObject(),
  body('priority').optional().isInt({ min: 0, max: 10 }),
  validate,
  workflowController.createWorkflow.bind(workflowController)
);

// GET /api/v1/workflows/:id - Get workflow by ID
router.get('/:id',
  param('id').isUUID(),
  validate,
  workflowController.getWorkflow.bind(workflowController)
);

// PUT /api/v1/workflows/:id - Update workflow
router.put('/:id',
  param('id').isUUID(),
  body('name').optional().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('definition').optional().isObject(),
  body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  body('priority').optional().isInt({ min: 0, max: 10 }),
  validate,
  workflowController.updateWorkflow.bind(workflowController)
);

// DELETE /api/v1/workflows/:id - Delete workflow
router.delete('/:id',
  param('id').isUUID(),
  validate,
  workflowController.deleteWorkflow.bind(workflowController)
);

// POST /api/v1/workflows/:id/execute - Execute workflow
router.post('/:id/execute',
  param('id').isUUID(),
  body('inputData').optional().isObject(),
  validate,
  workflowController.executeWorkflow.bind(workflowController)
);

// POST /api/v1/workflows/:id/validate - Validate workflow
router.post('/:id/validate',
  param('id').isUUID(),
  validate,
  workflowController.validateWorkflow.bind(workflowController)
);

// POST /api/v1/workflows/:id/duplicate - Duplicate workflow
router.post('/:id/duplicate',
  param('id').isUUID(),
  body('name').optional().isString(),
  validate,
  workflowController.duplicateWorkflow.bind(workflowController)
);

// GET /api/v1/workflows/:id/executions - Get workflow executions
router.get('/:id/executions',
  param('id').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'STOPPED']),
  validate,
  workflowController.getWorkflowExecutions.bind(workflowController)
);

export { router as workflowRoutes };
