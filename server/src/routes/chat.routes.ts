import { Router } from 'express';
import { searchUsers, getConversations, startConversation, getMessages, sendMessage, blockUser, unblockUser, getBlockedUsers } from '../controllers/chatController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.get('/users/search', authenticate, searchUsers);
router.get('/conversations', authenticate, getConversations);
router.post('/conversations', authenticate, startConversation);
router.get('/conversations/:id/messages', authenticate, getMessages);
router.post('/conversations/:id/messages', authenticate, sendMessage);
router.post('/users/:userId/block', authenticate, blockUser);
router.delete('/users/:userId/block', authenticate, unblockUser);
router.get('/blocked', authenticate, getBlockedUsers);
export default router;
