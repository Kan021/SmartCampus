"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNoticeSchema = exports.createNoticeSchema = void 0;
const zod_1 = require("zod");
exports.createNoticeSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(200),
    content: zod_1.z.string().min(5, 'Content must be at least 5 characters').max(2000),
    category: zod_1.z.enum(['general', 'academic', 'exam', 'event', 'urgent']).default('general'),
    pdfBase64: zod_1.z.string().optional(),
    pdfFileName: zod_1.z.string().optional(),
});
exports.updateNoticeSchema = exports.createNoticeSchema.partial();
//# sourceMappingURL=notice.types.js.map