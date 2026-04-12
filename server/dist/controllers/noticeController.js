"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotice = createNotice;
exports.getNotices = getNotices;
exports.getBulletin = getBulletin;
exports.getNoticeById = getNoticeById;
exports.downloadNoticePdf = downloadNoticePdf;
exports.deleteNotice = deleteNotice;
const prisma_1 = require("../utils/prisma");
const notice_types_1 = require("../types/notice.types");
const notificationService_1 = require("../services/notificationService");
const STATIC_PDF_BASE = 'http://localhost:5000/api/notices/files';
// ─── POST /api/notices — Create notice (admin/faculty) ───────────────────
async function createNotice(req, res) {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        if (userRole === 'student') {
            res.status(403).json({ success: false, message: 'Only faculty and admin can create notices.' });
            return;
        }
        const parsed = notice_types_1.createNoticeSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const notice = await prisma_1.prisma.notice.create({
            data: { ...parsed.data, authorId: userId },
            include: { author: { select: { fullName: true, role: true } } },
        });
        // Fire-and-forget: email all users about the new notice
        (0, notificationService_1.notifyAllUsersAboutNotice)({
            title: notice.title,
            category: notice.category,
            authorName: notice.author.fullName,
        });
        res.status(201).json({ success: true, message: 'Notice published successfully.', data: notice });
    }
    catch (err) {
        console.error('createNotice error:', err);
        res.status(500).json({ success: false, message: 'Failed to create notice.' });
    }
}
// ─── GET /api/notices — List all notices (latest first) ──────────────────
async function getNotices(req, res) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const category = req.query.category;
        const skip = (page - 1) * limit;
        const where = { isPublished: true };
        if (category && category !== 'all')
            where.category = category;
        const [notices, total] = await Promise.all([
            prisma_1.prisma.notice.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    content: true,
                    category: true,
                    pdfFileName: true,
                    staticPdfPath: true,
                    isPublished: true,
                    createdAt: true,
                    author: { select: { fullName: true, role: true } },
                    // Exclude pdfBase64 from list to keep responses small
                },
            }),
            prisma_1.prisma.notice.count({ where }),
        ]);
        // Attach resolved download URL for static PDFs
        const noticesWithUrls = notices.map((n) => ({
            ...n,
            pdfUrl: n.staticPdfPath
                ? `${STATIC_PDF_BASE}/${encodeURIComponent(n.staticPdfPath)}`
                : null,
        }));
        res.json({
            success: true,
            data: {
                notices: noticesWithUrls,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch (err) {
        console.error('getNotices error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch notices.' });
    }
}
// ─── GET /api/notices/bulletin — Latest 10 notice titles for ticker ──────
async function getBulletin(req, res) {
    try {
        const notices = await prisma_1.prisma.notice.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, title: true, category: true, createdAt: true },
        });
        res.json({ success: true, data: notices });
    }
    catch (err) {
        console.error('getBulletin error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch bulletin.' });
    }
}
// ─── GET /api/notices/:id — Get single notice with PDF data ──────────────
async function getNoticeById(req, res) {
    try {
        const id = String(req.params.id);
        const notice = await prisma_1.prisma.notice.findUnique({
            where: { id },
            include: { author: { select: { fullName: true, role: true } } },
        });
        if (!notice) {
            res.status(404).json({ success: false, message: 'Notice not found.' });
            return;
        }
        const pdfUrl = notice.staticPdfPath
            ? `${STATIC_PDF_BASE}/${encodeURIComponent(notice.staticPdfPath)}`
            : null;
        res.json({ success: true, data: { ...notice, pdfUrl } });
    }
    catch (err) {
        console.error('getNoticeById error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch notice.' });
    }
}
// ─── GET /api/notices/:id/pdf — Download PDF (base64 fallback or redirect to static) ──
async function downloadNoticePdf(req, res) {
    try {
        const id = String(req.params.id);
        const notice = await prisma_1.prisma.notice.findUnique({
            where: { id },
            select: { pdfBase64: true, pdfFileName: true, staticPdfPath: true, title: true },
        });
        if (!notice) {
            res.status(404).json({ success: false, message: 'Notice not found.' });
            return;
        }
        // Prefer static file URL over base64
        if (notice.staticPdfPath) {
            res.json({
                success: true,
                data: {
                    pdfUrl: `${STATIC_PDF_BASE}/${encodeURIComponent(notice.staticPdfPath)}`,
                    fileName: notice.pdfFileName || notice.staticPdfPath,
                    isStatic: true,
                },
            });
            return;
        }
        if (notice.pdfBase64) {
            res.json({
                success: true,
                data: {
                    pdfBase64: notice.pdfBase64,
                    fileName: notice.pdfFileName || `${notice.title}.pdf`,
                    isStatic: false,
                },
            });
            return;
        }
        res.status(404).json({ success: false, message: 'PDF not found for this notice.' });
    }
    catch (err) {
        console.error('downloadNoticePdf error:', err);
        res.status(500).json({ success: false, message: 'Failed to download PDF.' });
    }
}
// ─── DELETE /api/notices/:id — Delete notice (admin/author) ──────────────
async function deleteNotice(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const notice = await prisma_1.prisma.notice.findUnique({ where: { id } });
        if (!notice) {
            res.status(404).json({ success: false, message: 'Notice not found.' });
            return;
        }
        // Only admin or author can delete
        if (userRole !== 'admin' && notice.authorId !== userId) {
            res.status(403).json({ success: false, message: 'You can only delete your own notices.' });
            return;
        }
        await prisma_1.prisma.notice.delete({ where: { id } });
        res.json({ success: true, message: 'Notice deleted.' });
    }
    catch (err) {
        console.error('deleteNotice error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete notice.' });
    }
}
//# sourceMappingURL=noticeController.js.map