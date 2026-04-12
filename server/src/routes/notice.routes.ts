import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createNotice,
  getNotices,
  getBulletin,
  getNoticeById,
  downloadNoticePdf,
  deleteNotice,
} from '../controllers/noticeController';

const router = Router();

// ─── Public-ish routes (still need auth) ─────────────────────────────────
router.use(authenticate);

router.get('/', getNotices);
router.get('/bulletin', getBulletin);
router.get('/:id', getNoticeById);
router.get('/:id/pdf', downloadNoticePdf);

// ─── Faculty/Admin routes ────────────────────────────────────────────────
router.post('/', createNotice);
router.delete('/:id', deleteNotice);

export default router;
