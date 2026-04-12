"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFileSchema = exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200),
    description: zod_1.z.string().min(10).max(5000),
    venue: zod_1.z.string().min(2).max(300),
    eventDate: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().min(1)),
    endDate: zod_1.z.string().optional().nullable(),
    category: zod_1.z.enum(['cultural', 'technical', 'sports', 'academic', 'workshop', 'seminar', 'general']).default('general'),
    organizerType: zod_1.z.enum(['club', 'faculty', 'admin', 'department']).default('club'),
    organizerName: zod_1.z.string().min(2).max(200),
    clubName: zod_1.z.string().optional().nullable(),
    clubContact: zod_1.z.string().optional().nullable(),
    clubLogoBase64: zod_1.z.string().optional().nullable(),
    facultyName: zod_1.z.string().optional().nullable(),
    facultyPhone: zod_1.z.string().optional().nullable(),
    facultyEmail: zod_1.z.string().email().optional().nullable().or(zod_1.z.literal('')),
    registrationLink: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal('')),
    maxParticipants: zod_1.z.number().int().positive().optional().nullable(),
    tags: zod_1.z.string().optional().default(''),
    isPublished: zod_1.z.boolean().optional().default(true),
});
exports.updateEventSchema = exports.createEventSchema.partial();
exports.addFileSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1).max(300),
    fileBase64: zod_1.z.string().min(1),
    fileType: zod_1.z.enum(['pdf', 'image', 'doc', 'ppt', 'other']),
    fileSizeKb: zod_1.z.number().int().optional().nullable(),
});
//# sourceMappingURL=event.types.js.map