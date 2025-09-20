import { Router } from 'express';
import { ExecutionController } from '../controllers/ExecutionController';
const expressValidator = require('express-validator');

const { param, query } = expressValidator;
const router = Router();
const executionController = new ExecutionController();

router.get('/', executionController.getAllExecutions.bind(executionController));
router.get('/:id', executionController.getExecutionById.bind(executionController));
router.post('/:id/pause', executionController.pauseExecution.bind(executionController));
router.post('/:id/resume', executionController.resumeExecution.bind(executionController));
router.post('/:id/stop', executionController.stopExecution.bind(executionController));

export default router;
