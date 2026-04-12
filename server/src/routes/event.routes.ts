import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addEventFile,
  downloadEventFile,
  deleteEventFile,
} from '../controllers/eventController';

const router = Router();

// All event routes require authentication
router.use(authenticate);

// ─── Event CRUD ──────────────────────────────────────────────────
router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);          // any authenticated user
router.put('/:id', updateEvent);        // author or admin
router.delete('/:id', deleteEvent);     // author or admin

// ─── Event File Attachments ──────────────────────────────────────
router.post('/:id/files', addEventFile);
router.get('/:id/files/:fileId', downloadEventFile);
router.delete('/:id/files/:fileId', deleteEventFile);

export default router;
