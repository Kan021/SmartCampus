"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendanceSchema = exports.createSessionSchema = void 0;
const zod_1 = require("zod");
// ─── Create Attendance Session ─────────────────────────────────────────
exports.createSessionSchema = zod_1.z.object({
    subject: zod_1.z.string().min(2, 'Subject must be at least 2 characters').max(200),
    date: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
    duration: zod_1.z.number().int().min(5, 'Duration must be at least 5 minutes').max(180, 'Duration cannot exceed 3 hours').default(15),
});
// ─── Mark Attendance ───────────────────────────────────────────────────
exports.markAttendanceSchema = zod_1.z.object({
    sessionCode: zod_1.z.string().length(8, 'Session code must be 8 characters'),
});
//# sourceMappingURL=attendance.types.js.map