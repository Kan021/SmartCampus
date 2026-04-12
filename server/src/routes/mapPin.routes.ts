import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { listPins, createPin, deletePin } from '../controllers/mapPinController';

const router = Router();

router.get('/',    authenticate, listPins);
router.post('/',   authenticate, createPin);
router.delete('/:id', authenticate, deletePin);

export default router;
