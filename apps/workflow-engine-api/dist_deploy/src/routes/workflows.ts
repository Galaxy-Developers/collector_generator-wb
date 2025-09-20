import { Router } from 'express';
import { WorkflowController } from '../controllers/WorkflowController';
const expressValidator = require('express-validator');

const { body, param, query } = expressValidator;
const router = Router();
const workflowController = new WorkflowController();

router.get('/', workflowController.getAllWorkflows.bind(workflowController));
router.get('/:id', workflowController.getWorkflowById.bind(workflowController));
router.post('/', workflowController.createWorkflow.bind(workflowController));
router.put('/:id', workflowController.updateWorkflow.bind(workflowController));
router.delete('/:id', workflowController.deleteWorkflow.bind(workflowController));
router.post('/:id/execute', workflowController.executeWorkflow.bind(workflowController));

export default router;
