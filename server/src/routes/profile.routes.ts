import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getMyProfile,
  updateMyProfile,
  listUsers,
  getUserProfile,
  updateUserRole,
  updateUserProfile,
  bulkUpdateProfiles,
} from '../controllers/profileController';

const router = Router();

// ─── All profile routes require authentication ────────────────────────────
router.use(authenticate);

// ─── Current user routes ─────────────────────────────────────────────────
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);

// ─── Admin-only routes ───────────────────────────────────────────────────
router.get('/users', authorize('admin'), listUsers);
router.get('/:userId', authorize('admin'), getUserProfile);
router.patch('/users/:userId/role', authorize('admin'), updateUserRole);
router.put('/users/:userId', authorize('admin'), updateUserProfile);
router.post('/bulk-update', authorize('admin'), bulkUpdateProfiles);

export default router;
