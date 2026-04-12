import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createNoticeSchema } from '../types/notice.types';
import { notifyAllUsersAboutNotice } from '../services/notificationService';

const STATIC_PDF_BASE = 'http://localhost:5000/api/notices/files';

// ─── POST /api/notices — Create notice (admin/faculty) ───────────────────
export async function createNotice(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (userRole === 'student') {
      res.status(403).json({ success: false, message: 'Only faculty and admin can create notices.' });
      return;
    }

    const parsed = createNoticeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const notice = await prisma.notice.create({
      data: { ...parsed.data, authorId: userId },
      include: { author: { select: { fullName: true, role: true } } },
    });

    // Fire-and-forget: email all users about the new notice
    notifyAllUsersAboutNotice({
      title: notice.title,
      category: notice.category,
      authorName: notice.author.fullName,
    });

    res.status(201).json({ success: true, message: 'Notice published successfully.', data: notice });
  } catch (err) {
    console.error('createNotice error:', err);
    res.status(500).json({ success: false, message: 'Failed to create notice.' });
  }
}

// ─── GET /api/notices — List all notices (latest first) ──────────────────
export async function getNotices(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const category = req.query.category as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = { isPublished: true };
    if (category && category !== 'all') where.category = category;

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
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
      prisma.notice.count({ where }),
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
  } catch (err) {
    console.error('getNotices error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notices.' });
  }
}

// ─── GET /api/notices/bulletin — Latest 10 notice titles for ticker ──────
export async function getBulletin(req: Request, res: Response): Promise<void> {
  try {
    const notices = await prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, category: true, createdAt: true },
    });
    res.json({ success: true, data: notices });
  } catch (err) {
    console.error('getBulletin error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bulletin.' });
  }
}

// ─── GET /api/notices/:id — Get single notice with PDF data ──────────────
export async function getNoticeById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const notice = await prisma.notice.findUnique({
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
  } catch (err) {
    console.error('getNoticeById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notice.' });
  }
}

// ─── GET /api/notices/:id/pdf — Download PDF (base64 fallback or redirect to static) ──
export async function downloadNoticePdf(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const notice = await prisma.notice.findUnique({
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
  } catch (err) {
    console.error('downloadNoticePdf error:', err);
    res.status(500).json({ success: false, message: 'Failed to download PDF.' });
  }
}

// ─── DELETE /api/notices/:id — Delete notice (admin/author) ──────────────
export async function deleteNotice(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      res.status(404).json({ success: false, message: 'Notice not found.' });
      return;
    }

    // Only admin or author can delete
    if (userRole !== 'admin' && notice.authorId !== userId) {
      res.status(403).json({ success: false, message: 'You can only delete your own notices.' });
      return;
    }

    await prisma.notice.delete({ where: { id } });
    res.json({ success: true, message: 'Notice deleted.' });
  } catch (err) {
    console.error('deleteNotice error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete notice.' });
  }
}
