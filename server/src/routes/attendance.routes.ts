import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createSession,
  getMySessions,
  getSessionByCode,
  markAttendance,
  getMyAttendance,
  getSessionRecords,
  getAttendanceStats,
  getMyPercentage,
  getTimetable,
  uploadTimetable,
  deleteTimetable,
} from '../controllers/attendanceController';

const router = Router();

// ─── All attendance routes require authentication ─────────────────────────
router.use(authenticate);

// ─── Student routes ──────────────────────────────────────────────────────
router.post('/mark', markAttendance);
router.get('/my-records', getMyAttendance);
router.get('/my-percentage', getMyPercentage);

// ─── Faculty/Admin routes ────────────────────────────────────────────────
router.post('/sessions', createSession);
router.get('/sessions', getMySessions);
router.get('/sessions/:code', getSessionByCode);
router.get('/sessions/:id/records', getSessionRecords);

// ─── Timetable ──────────────────────────────────────────────────────────
router.get('/timetable/:section', getTimetable);
router.post('/timetable', authorize('admin'), uploadTimetable);
router.delete('/timetable/:section', authorize('admin'), deleteTimetable);

// ─── Admin-only routes ──────────────────────────────────────────────────
router.get('/stats', authorize('admin'), getAttendanceStats);

export default router;
