import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getBooks, createBook, updateBook, deleteBook,
  getMyIssues, getAllIssues, issueBook, returnBook, updatePenalty,
  getLibraryStats, searchStudents, toggleLibrarian,
} from '../controllers/libraryController';

const router = Router();

// All library routes require authentication
router.use(authenticate);

// ─── Book Catalogue (visible to all roles) ──────────────────────
router.get('/books', getBooks);

// ─── Library Staff / Admin ──────────────────────────────────────
router.post('/books', createBook);
router.put('/books/:id', updateBook);
router.delete('/books/:id', authorize('admin'), deleteBook);

// ─── Student: own issues ────────────────────────────────────────
router.get('/my-issues', getMyIssues);

// ─── All issues (librarian/admin) ───────────────────────────────
router.get('/issues', getAllIssues);
router.post('/issue', issueBook);
router.put('/issues/:id/return', returnBook);
router.patch('/issues/:id/penalty', updatePenalty);

// ─── Stats ──────────────────────────────────────────────────────
router.get('/stats', getLibraryStats);

// ─── Student search for issue form ─────────────────────────────
router.get('/students', searchStudents);

// ─── Admin: toggle librarian flag ──────────────────────────────
router.patch('/staff/:userId', authorize('admin'), toggleLibrarian);

export default router;
