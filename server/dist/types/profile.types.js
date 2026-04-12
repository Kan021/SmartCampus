"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersQuerySchema = exports.updateUserRoleSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
// ─── Update Profile Schema ─────────────────────────────────────────────────
exports.updateProfileSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number')
        .optional()
        .nullable(),
    bio: zod_1.z.string().max(400, 'Bio must be under 400 characters').optional().nullable(),
    department: zod_1.z.string().max(100).optional().nullable(),
    avatarBase64: zod_1.z
        .string()
        .refine((val) => !val || val.startsWith('data:image/'), 'Avatar must be a valid base64 image data URL')
        .optional()
        .nullable(),
    // Student fields
    rollNumber: zod_1.z.string().max(30).optional().nullable(),
    year: zod_1.z.number().int().min(1).max(6).optional().nullable(),
    section: zod_1.z.string().max(10).optional().nullable(),
    course: zod_1.z.string().max(100).optional().nullable(),
    bloodGroup: zod_1.z.string().max(5).optional().nullable(),
    altPhone: zod_1.z.string().max(20).optional().nullable(),
    universityRollNo: zod_1.z.string().max(30).optional().nullable(),
    university: zod_1.z.string().max(50).optional().nullable(),
    hostelName: zod_1.z.string().max(100).optional().nullable(),
    hostelRoom: zod_1.z.string().max(20).optional().nullable(),
    homeAddress: zod_1.z.string().max(500).optional().nullable(),
    // Faculty fields
    employeeId: zod_1.z.string().max(30).optional().nullable(),
    designation: zod_1.z.string().max(100).optional().nullable(),
    // Admin fields
    adminCode: zod_1.z.string().max(30).optional().nullable(),
});
// ─── Admin: Update User Role Schema ───────────────────────────────────────
exports.updateUserRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['student', 'faculty', 'admin'], {
        errorMap: () => ({ message: 'Role must be student, faculty, or admin' }),
    }),
});
// ─── Admin: List Users Query Schema ───────────────────────────────────────
exports.listUsersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    role: zod_1.z.enum(['student', 'faculty', 'admin']).optional(),
    search: zod_1.z.string().max(100).optional(),
    year: zod_1.z.coerce.number().int().min(1).max(6).optional(),
    section: zod_1.z.string().max(20).optional(),
    course: zod_1.z.string().max(20).optional(),
});
//# sourceMappingURL=profile.types.js.map