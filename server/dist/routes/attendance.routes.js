"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const attendanceController_1 = require("../controllers/attendanceController");
const router = (0, express_1.Router)();
// ─── All attendance routes require authentication ─────────────────────────
router.use(auth_middleware_1.authenticate);
// ─── Student routes ──────────────────────────────────────────────────────
router.post('/mark', attendanceController_1.markAttendance);
router.get('/my-records', attendanceController_1.getMyAttendance);
router.get('/my-percentage', attendanceController_1.getMyPercentage);
// ─── Faculty/Admin routes ────────────────────────────────────────────────
router.post('/sessions', attendanceController_1.createSession);
router.get('/sessions', attendanceController_1.getMySessions);
router.get('/sessions/:code', attendanceController_1.getSessionByCode);
router.get('/sessions/:id/records', attendanceController_1.getSessionRecords);
// ─── Timetable ──────────────────────────────────────────────────────────
router.get('/timetable/:section', attendanceController_1.getTimetable);
router.post('/timetable', (0, auth_middleware_1.authorize)('admin'), attendanceController_1.uploadTimetable);
router.delete('/timetable/:section', (0, auth_middleware_1.authorize)('admin'), attendanceController_1.deleteTimetable);
// ─── Admin-only routes ──────────────────────────────────────────────────
router.get('/stats', (0, auth_middleware_1.authorize)('admin'), attendanceController_1.getAttendanceStats);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map