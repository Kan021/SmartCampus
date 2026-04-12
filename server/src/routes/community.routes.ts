import { Router } from 'express';
import { getCommunities, createCommunity, updateCommunity, deleteCommunity } from '../controllers/communityController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.get('/', authenticate, getCommunities);
router.post('/', authenticate, createCommunity);
router.put('/:id', authenticate, updateCommunity);
router.delete('/:id', authenticate, deleteCommunity);
export default router;
