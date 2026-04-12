import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getSubjects, createSubject,
  getMyMarks, uploadMark, bulkUploadMarks,
  getFeeStructures, createFeeStructure, getMyFees, markFeePayment, getFeeSummary,
  uploadFeeReceipt, reviewFeeReceipt, getPendingReceipts,
  getCalendarEvents, createCalendarEvent, deleteCalendarEvent,
} from '../controllers/academicsController';

const router = Router();

// ─── All academics routes require auth ────────────────────────
router.use(authenticate);

// ─── Subjects ─────────────────────────────────────────────────
router.get('/subjects', getSubjects);
router.post('/subjects', authorize('admin'), createSubject);

// ─── Marks ────────────────────────────────────────────────────
router.get('/marks/my', getMyMarks);
router.post('/marks', authorize('admin', 'faculty'), uploadMark);
router.post('/marks/bulk', authorize('admin', 'faculty'), bulkUploadMarks);

// ─── Fees ─────────────────────────────────────────────────────
router.get('/fees/structures', getFeeStructures);
router.post('/fees/structures', authorize('admin'), createFeeStructure);
router.get('/fees/my', getMyFees);
router.post('/fees/pay', authorize('admin'), markFeePayment);
router.get('/fees/summary', authorize('admin'), getFeeSummary);
router.post('/fees/receipt', uploadFeeReceipt);
router.put('/fees/receipt/:paymentId/review', authorize('admin', 'faculty'), reviewFeeReceipt);
router.get('/fees/receipts/pending', authorize('admin', 'faculty'), getPendingReceipts);

// ─── Calendar ─────────────────────────────────────────────────
router.get('/calendar', getCalendarEvents);
router.post('/calendar', authorize('admin'), createCalendarEvent);
router.delete('/calendar/:id', authorize('admin'), deleteCalendarEvent);

export default router;
