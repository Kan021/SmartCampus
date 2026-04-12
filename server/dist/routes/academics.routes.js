"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const academicsController_1 = require("../controllers/academicsController");
const router = (0, express_1.Router)();
// ─── All academics routes require auth ────────────────────────
router.use(auth_middleware_1.authenticate);
// ─── Subjects ─────────────────────────────────────────────────
router.get('/subjects', academicsController_1.getSubjects);
router.post('/subjects', (0, auth_middleware_1.authorize)('admin'), academicsController_1.createSubject);
// ─── Marks ────────────────────────────────────────────────────
router.get('/marks/my', academicsController_1.getMyMarks);
router.post('/marks', (0, auth_middleware_1.authorize)('admin', 'faculty'), academicsController_1.uploadMark);
router.post('/marks/bulk', (0, auth_middleware_1.authorize)('admin', 'faculty'), academicsController_1.bulkUploadMarks);
// ─── Fees ─────────────────────────────────────────────────────
router.get('/fees/structures', academicsController_1.getFeeStructures);
router.post('/fees/structures', (0, auth_middleware_1.authorize)('admin'), academicsController_1.createFeeStructure);
router.get('/fees/my', academicsController_1.getMyFees);
router.post('/fees/pay', (0, auth_middleware_1.authorize)('admin'), academicsController_1.markFeePayment);
router.get('/fees/summary', (0, auth_middleware_1.authorize)('admin'), academicsController_1.getFeeSummary);
router.post('/fees/receipt', academicsController_1.uploadFeeReceipt);
router.put('/fees/receipt/:paymentId/review', (0, auth_middleware_1.authorize)('admin', 'faculty'), academicsController_1.reviewFeeReceipt);
router.get('/fees/receipts/pending', (0, auth_middleware_1.authorize)('admin', 'faculty'), academicsController_1.getPendingReceipts);
// ─── Calendar ─────────────────────────────────────────────────
router.get('/calendar', academicsController_1.getCalendarEvents);
router.post('/calendar', (0, auth_middleware_1.authorize)('admin'), academicsController_1.createCalendarEvent);
router.delete('/calendar/:id', (0, auth_middleware_1.authorize)('admin'), academicsController_1.deleteCalendarEvent);
exports.default = router;
//# sourceMappingURL=academics.routes.js.map