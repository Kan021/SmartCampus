import { Router } from 'express';
import { getManagement, createManagement, updateManagement, deleteManagement } from '../controllers/managementController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.get('/', authenticate, getManagement);
router.post('/', authenticate, createManagement);
router.put('/:id', authenticate, updateManagement);
router.delete('/:id', authenticate, deleteManagement);
export default router;
