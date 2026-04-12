import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getMyClassroom, createClassroom, getMembers,
  getNotes, uploadNote, downloadNote, deleteNote,
  getMessages, postMessage, joinFaculty,
} from '../controllers/classroomController';

const router = Router();

router.use(authenticate);

router.get('/my', getMyClassroom);
router.post('/create', authorize('admin'), createClassroom);
router.get('/:id/members', getMembers);
router.get('/:id/notes', getNotes);
router.post('/:id/notes', uploadNote);
router.get('/:id/notes/:noteId/download', downloadNote);
router.delete('/:id/notes/:noteId', deleteNote);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);
router.post('/:id/join-faculty', authorize('admin'), joinFaculty);

export default router;
