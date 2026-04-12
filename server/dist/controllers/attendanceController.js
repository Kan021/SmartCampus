"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getMySessions = getMySessions;
exports.getSessionByCode = getSessionByCode;
exports.markAttendance = markAttendance;
exports.getMyAttendance = getMyAttendance;
exports.getSessionRecords = getSessionRecords;
exports.getAttendanceStats = getAttendanceStats;
exports.getMyPercentage = getMyPercentage;
exports.getTimetable = getTimetable;
exports.uploadTimetable = uploadTimetable;
exports.deleteTimetable = deleteTimetable;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../utils/prisma");
const attendance_types_1 = require("../types/attendance.types");
// ─── Helper: generate unique 8-char session code ─────────────────────────
function generateSessionCode() {
    return crypto_1.default.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F1B2C4"
}
// ─── POST /api/attendance/sessions — Faculty/Admin creates a session ─────
async function createSession(req, res) {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        if (userRole === 'student') {
            res.status(403).json({ success: false, message: 'Only faculty and admin can create sessions.' });
            return;
        }
        const parsed = attendance_types_1.createSessionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { subject, date, duration } = parsed.data;
        const sessionDate = new Date(date);
        const expiresAt = new Date(sessionDate.getTime() + duration * 60 * 1000);
        // Generate unique session code (retry on collision)
        let sessionCode = generateSessionCode();
        let attempts = 0;
        while (attempts < 5) {
            const existing = await prisma_1.prisma.attendanceSession.findUnique({ where: { sessionCode } });
            if (!existing)
                break;
            sessionCode = generateSessionCode();
            attempts++;
        }
        const session = await prisma_1.prisma.attendanceSession.create({
            data: {
                facultyId: userId,
                subject,
                sessionCode,
                date: sessionDate,
                duration,
                expiresAt,
            },
        });
        res.status(201).json({
            success: true,
            message: 'Attendance session created successfully.',
            data: session,
        });
    }
    catch (err) {
        console.error('createSession error:', err);
        res.status(500).json({ success: false, message: 'Failed to create session.' });
    }
}
// ─── GET /api/attendance/sessions — Faculty/Admin lists their sessions ───
async function getMySessions(req, res) {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const where = userRole === 'admin' ? {} : { facultyId: userId };
        const sessions = await prisma_1.prisma.attendanceSession.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                faculty: { select: { fullName: true, email: true } },
                _count: { select: { records: true } },
            },
        });
        // Enrich with expiry status
        const enriched = sessions.map((s) => ({
            ...s,
            isExpired: new Date() > new Date(s.expiresAt),
            attendeeCount: s._count.records,
        }));
        res.json({ success: true, data: enriched });
    }
    catch (err) {
        console.error('getMySessions error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
    }
}
// ─── GET /api/attendance/sessions/:code — Get session by code ────────────
async function getSessionByCode(req, res) {
    try {
        const code = String(req.params.code).toUpperCase();
        const session = await prisma_1.prisma.attendanceSession.findUnique({
            where: { sessionCode: code },
            include: {
                faculty: { select: { fullName: true } },
                _count: { select: { records: true } },
            },
        });
        if (!session) {
            res.status(404).json({ success: false, message: 'Session not found.' });
            return;
        }
        res.json({
            success: true,
            data: {
                ...session,
                isExpired: new Date() > new Date(session.expiresAt),
                attendeeCount: session._count.records,
            },
        });
    }
    catch (err) {
        console.error('getSessionByCode error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch session.' });
    }
}
// ─── POST /api/attendance/mark — Student marks attendance ────────────────
async function markAttendance(req, res) {
    try {
        const studentId = req.user.userId;
        const studentRole = req.user.role;
        if (studentRole !== 'student') {
            res.status(403).json({ success: false, message: 'Only students can mark attendance.' });
            return;
        }
        const parsed = attendance_types_1.markAttendanceSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { sessionCode } = parsed.data;
        // Find the session
        const session = await prisma_1.prisma.attendanceSession.findUnique({
            where: { sessionCode: sessionCode.toUpperCase() },
        });
        if (!session) {
            res.status(404).json({ success: false, message: 'Invalid session code. Please check and try again.' });
            return;
        }
        if (!session.isActive) {
            res.status(400).json({ success: false, message: 'This session has been deactivated.' });
            return;
        }
        if (new Date() > new Date(session.expiresAt)) {
            res.status(400).json({ success: false, message: 'This session has expired. Attendance can no longer be marked.' });
            return;
        }
        // Check if already marked
        const existing = await prisma_1.prisma.attendanceRecord.findUnique({
            where: {
                sessionId_studentId: {
                    sessionId: session.id,
                    studentId,
                },
            },
        });
        if (existing) {
            res.status(409).json({ success: false, message: 'You have already marked attendance for this session.' });
            return;
        }
        // Create attendance record
        const record = await prisma_1.prisma.attendanceRecord.create({
            data: {
                sessionId: session.id,
                studentId,
            },
            include: {
                session: { select: { subject: true, faculty: { select: { fullName: true } } } },
            },
        });
        res.status(201).json({
            success: true,
            message: `Attendance marked for "${record.session.subject}" by ${record.session.faculty.fullName}.`,
            data: record,
        });
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ success: false, message: 'Attendance already marked for this session.' });
            return;
        }
        console.error('markAttendance error:', err);
        res.status(500).json({ success: false, message: 'Failed to mark attendance.' });
    }
}
// ─── GET /api/attendance/my-records — Student views their attendance ─────
async function getMyAttendance(req, res) {
    try {
        const studentId = req.user.userId;
        const records = await prisma_1.prisma.attendanceRecord.findMany({
            where: { studentId },
            orderBy: { markedAt: 'desc' },
            include: {
                session: {
                    select: {
                        subject: true,
                        date: true,
                        sessionCode: true,
                        faculty: { select: { fullName: true } },
                    },
                },
            },
        });
        res.json({ success: true, data: records });
    }
    catch (err) {
        console.error('getMyAttendance error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
    }
}
// ─── GET /api/attendance/sessions/:id/records — Session attendance list ──
async function getSessionRecords(req, res) {
    try {
        const sessionId = String(req.params.id);
        const session = await prisma_1.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                records: {
                    orderBy: { markedAt: 'asc' },
                    include: {
                        student: {
                            select: {
                                fullName: true,
                                email: true,
                                profile: { select: { rollNumber: true, department: true } },
                            },
                        },
                    },
                },
                faculty: { select: { fullName: true } },
            },
        });
        if (!session) {
            res.status(404).json({ success: false, message: 'Session not found.' });
            return;
        }
        res.json({ success: true, data: session });
    }
    catch (err) {
        console.error('getSessionRecords error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch session records.' });
    }
}
// ─── GET /api/attendance/stats — Admin attendance analytics ──────────────
async function getAttendanceStats(req, res) {
    try {
        const totalSessions = await prisma_1.prisma.attendanceSession.count();
        const totalRecords = await prisma_1.prisma.attendanceRecord.count();
        const activeSessions = await prisma_1.prisma.attendanceSession.count({
            where: { isActive: true, expiresAt: { gt: new Date() } },
        });
        // Recent sessions
        const recentSessions = await prisma_1.prisma.attendanceSession.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                faculty: { select: { fullName: true } },
                _count: { select: { records: true } },
            },
        });
        res.json({
            success: true,
            data: {
                totalSessions,
                totalRecords,
                activeSessions,
                recentSessions: recentSessions.map((s) => ({
                    ...s,
                    isExpired: new Date() > new Date(s.expiresAt),
                    attendeeCount: s._count.records,
                })),
            },
        });
    }
    catch (err) {
        console.error('getAttendanceStats error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance stats.' });
    }
}
// ─── GET /api/attendance/my-percentage — Student attendance percentage ────
async function getMyPercentage(req, res) {
    try {
        const studentId = req.user.userId;
        const totalClasses = await prisma_1.prisma.attendanceSession.count();
        const presentClasses = await prisma_1.prisma.attendanceRecord.count({
            where: { studentId },
        });
        const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
        res.json({
            success: true,
            data: { totalClasses, presentClasses, percentage },
        });
    }
    catch (err) {
        console.error('getMyPercentage error:', err);
        res.status(500).json({ success: false, message: 'Failed to calculate attendance.' });
    }
}
// ─── GET /api/attendance/timetable/:section — Get timetable image ────────
async function getTimetable(req, res) {
    try {
        const section = String(req.params.section).toUpperCase();
        const tt = await prisma_1.prisma.timetable.findUnique({ where: { section } });
        if (!tt) {
            res.status(404).json({ success: false, message: 'No timetable found for this section.' });
            return;
        }
        res.json({ success: true, data: tt });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch timetable.' });
    }
}
// ─── POST /api/attendance/timetable — Admin uploads/updates timetable ────
async function uploadTimetable(req, res) {
    try {
        const { section, imageBase64 } = req.body;
        if (!section || !imageBase64) {
            res.status(400).json({ success: false, message: 'Section and image are required.' });
            return;
        }
        const sectionUpper = String(section).toUpperCase();
        const tt = await prisma_1.prisma.timetable.upsert({
            where: { section: sectionUpper },
            create: { section: sectionUpper, imageBase64 },
            update: { imageBase64 },
        });
        res.json({ success: true, message: `Timetable for ${sectionUpper} saved.`, data: tt });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save timetable.' });
    }
}
// ─── DELETE /api/attendance/timetable/:section — Admin deletes timetable ──
async function deleteTimetable(req, res) {
    try {
        const section = String(req.params.section).toUpperCase();
        await prisma_1.prisma.timetable.delete({ where: { section } });
        res.json({ success: true, message: `Timetable for ${section} deleted.` });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete timetable.' });
    }
}
//# sourceMappingURL=attendanceController.js.map