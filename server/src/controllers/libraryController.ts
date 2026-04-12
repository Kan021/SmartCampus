import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import {
  createBookSchema, updateBookSchema,
  issueBookSchema, returnBookSchema, markPenaltyPaidSchema,
} from '../types/library.types';

const PENALTY_RATE_DEFAULT = 2; // Rs per day

// ─── Helper: check if user is library staff (librarian or admin) ──
async function isLibraryStaff(userId: string, role: string): Promise<boolean> {
  if (role === 'admin') return true;
  if (role !== 'faculty') return false;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { isLibrarian: true } });
  return !!profile?.isLibrarian;
}

// ─── Helper: compute live penalty from due date ───────────────────
function computePenalty(dueDate: Date, returnDate: Date | null, rate: number): number {
  const checkDate = returnDate ?? new Date();
  const msDiff = checkDate.getTime() - dueDate.getTime();
  if (msDiff <= 0) return 0;
  const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  return days * rate;
}

// ─── GET /api/library/books — Book catalogue (all roles) ─────────
export async function getBooks(req: Request, res: Response): Promise<void> {
  try {
    const { category, search, page = '1', limit = '30' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (category && category !== 'all') where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({ where, skip, take: parseInt(limit), orderBy: { title: 'asc' } }),
      prisma.book.count({ where }),
    ]);

    res.json({ success: true, data: { books, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    console.error('getBooks error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch books.' });
  }
}

// ─── POST /api/library/books — Add book (librarian/admin) ────────
export async function createBook(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const parsed = createBookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { totalCopies, ...rest } = parsed.data;
    const book = await prisma.book.create({
      data: { ...rest, totalCopies, availableCopies: totalCopies },
    });

    res.status(201).json({ success: true, message: 'Book added to catalogue.', data: book });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A book with this ISBN already exists.' });
      return;
    }
    console.error('createBook error:', err);
    res.status(500).json({ success: false, message: 'Failed to add book.' });
  }
}

// ─── PUT /api/library/books/:id — Update book (librarian/admin) ──
export async function updateBook(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const id = String(req.params.id);
    const parsed = updateBookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const book = await prisma.book.update({ where: { id }, data: parsed.data });
    res.json({ success: true, message: 'Book updated.', data: book });
  } catch (err) {
    console.error('updateBook error:', err);
    res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
}

// ─── DELETE /api/library/books/:id — Delete book (admin only) ────
export async function deleteBook(req: Request, res: Response): Promise<void> {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required.' });
      return;
    }
    const id = String(req.params.id);
    await prisma.book.delete({ where: { id } });
    res.json({ success: true, message: 'Book removed from catalogue.' });
  } catch (err) {
    console.error('deleteBook error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
}

// ─── GET /api/library/my-issues — Student's issued books ─────────
export async function getMyIssues(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.user!;

    const issues = await prisma.bookIssue.findMany({
      where: { studentId: userId },
      orderBy: { issueDate: 'desc' },
      include: {
        book: { select: { title: true, author: true, isbn: true, category: true, shelfLocation: true } },
        issuedBy: { select: { fullName: true } },
      },
    });

    // Compute live penalty for unreturned overdue books
    const enriched = issues.map((issue) => {
      const livePenalty = issue.status !== 'returned'
        ? computePenalty(issue.dueDate, null, issue.penaltyRate)
        : issue.penaltyAmount;
      const isOverdue   = issue.status !== 'returned' && new Date() > issue.dueDate;
      return { ...issue, livePenalty, isOverdue };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('getMyIssues error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch your library records.' });
  }
}

// ─── GET /api/library/issues — All issues (librarian/admin) ──────
export async function getAllIssues(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const { status, studentId, bookId, page = '1', limit = '30' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (studentId) where.studentId = studentId;
    if (bookId) where.bookId = bookId;

    // Auto-update overdue statuses
    await prisma.bookIssue.updateMany({
      where: { status: 'issued', dueDate: { lt: new Date() } },
      data: { status: 'overdue' },
    });

    const [issues, total] = await Promise.all([
      prisma.bookIssue.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { issueDate: 'desc' },
        include: {
          book: { select: { title: true, author: true, isbn: true, category: true } },
          student: { select: { fullName: true, email: true, profile: { select: { rollNumber: true, course: true, year: true } } } },
          issuedBy: { select: { fullName: true } },
        },
      }),
      prisma.bookIssue.count({ where }),
    ]);

    // Enrich with live penalty
    const enriched = issues.map((issue) => {
      const livePenalty = issue.status !== 'returned'
        ? computePenalty(issue.dueDate, null, issue.penaltyRate)
        : issue.penaltyAmount;
      return { ...issue, livePenalty };
    });

    res.json({ success: true, data: { issues: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    console.error('getAllIssues error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch issues.' });
  }
}

// ─── POST /api/library/issue — Issue a book (librarian/admin) ────
export async function issueBook(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const parsed = issueBookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { bookId, studentId, dueDate, remarks, penaltyRate } = parsed.data;

    // Check book availability
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      res.status(404).json({ success: false, message: 'Book not found.' });
      return;
    }
    if (book.availableCopies <= 0) {
      res.status(409).json({ success: false, message: 'No copies available for this book.' });
      return;
    }

    // Check student exists
    const student = await prisma.user.findUnique({ where: { id: studentId, role: 'student' } });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    // Check student doesn't already have this book unreturned
    const existing = await prisma.bookIssue.findFirst({
      where: { bookId, studentId, status: { in: ['issued', 'overdue'] } },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Student already has this book issued.' });
      return;
    }

    // Create issue and decrement available copies (transaction)
    const [issue] = await prisma.$transaction([
      prisma.bookIssue.create({
        data: {
          bookId,
          studentId,
          issuedById: userId,
          dueDate: new Date(dueDate),
          remarks,
          penaltyRate: penaltyRate ?? PENALTY_RATE_DEFAULT,
        },
        include: {
          book: { select: { title: true, author: true, isbn: true } },
          student: { select: { fullName: true, email: true } },
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } },
      }),
    ]);

    res.status(201).json({ success: true, message: `"${book.title}" issued to ${student.fullName}.`, data: issue });
  } catch (err) {
    console.error('issueBook error:', err);
    res.status(500).json({ success: false, message: 'Failed to issue book.' });
  }
}

// ─── PUT /api/library/issues/:id/return — Return a book ──────────
export async function returnBook(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const id = String(req.params.id);
    const issue = await prisma.bookIssue.findUnique({ where: { id }, include: { book: true } });
    if (!issue) {
      res.status(404).json({ success: false, message: 'Issue record not found.' });
      return;
    }
    if (issue.status === 'returned') {
      res.status(409).json({ success: false, message: 'Book already returned.' });
      return;
    }

    const parsed = returnBookSchema.safeParse(req.body);
    const remarks = parsed.success ? parsed.data.remarks : undefined;

    const now = new Date();
    const finalPenalty = computePenalty(issue.dueDate, now, issue.penaltyRate);

    const [updated] = await prisma.$transaction([
      prisma.bookIssue.update({
        where: { id },
        data: {
          status: 'returned',
          returnDate: now,
          penaltyAmount: finalPenalty,
          remarks: remarks ?? issue.remarks,
        },
        include: {
          book: { select: { title: true, author: true } },
          student: { select: { fullName: true } },
        },
      }),
      prisma.book.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: `Book returned successfully.${finalPenalty > 0 ? ` Penalty: ₹${finalPenalty}` : ''}`,
      data: updated,
    });
  } catch (err) {
    console.error('returnBook error:', err);
    res.status(500).json({ success: false, message: 'Failed to process return.' });
  }
}

// ─── PATCH /api/library/issues/:id/penalty — Mark penalty paid ───
export async function updatePenalty(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const id = String(req.params.id);
    const parsed = markPenaltyPaidSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid payload.' });
      return;
    }

    const updated = await prisma.bookIssue.update({
      where: { id },
      data: { penaltyPaid: parsed.data.penaltyPaid },
      include: { book: { select: { title: true } }, student: { select: { fullName: true } } },
    });

    res.json({ success: true, message: `Penalty marked as ${parsed.data.penaltyPaid ? 'paid' : 'unpaid'}.`, data: updated });
  } catch (err) {
    console.error('updatePenalty error:', err);
    res.status(500).json({ success: false, message: 'Failed to update penalty.' });
  }
}

// ─── GET /api/library/stats — Library statistics (librarian/admin) ─
export async function getLibraryStats(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    // Auto-update overdue
    await prisma.bookIssue.updateMany({
      where: { status: 'issued', dueDate: { lt: new Date() } },
      data: { status: 'overdue' },
    });

    const [
      totalBooks, totalCopies, issuedCount, overdueCount, returnedCount, unpaidPenaltyCount,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.book.aggregate({ _sum: { totalCopies: true } }),
      prisma.bookIssue.count({ where: { status: 'issued' } }),
      prisma.bookIssue.count({ where: { status: 'overdue' } }),
      prisma.bookIssue.count({ where: { status: 'returned' } }),
      prisma.bookIssue.count({ where: { penaltyPaid: false, penaltyAmount: { gt: 0 } } }),
    ]);

    const penaltySum = await prisma.bookIssue.aggregate({
      where: { penaltyPaid: false, penaltyAmount: { gt: 0 } },
      _sum: { penaltyAmount: true },
    });

    res.json({
      success: true,
      data: {
        totalBooks,
        totalCopies: totalCopies._sum.totalCopies ?? 0,
        issued: issuedCount,
        overdue: overdueCount,
        returned: returnedCount,
        unpaidPenalties: unpaidPenaltyCount,
        unpaidPenaltyTotal: penaltySum._sum.penaltyAmount ?? 0,
      },
    });
  } catch (err) {
    console.error('getLibraryStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
}

// ─── GET /api/library/students — Search students for issue form ───
export async function searchStudents(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isLibraryStaff(userId, role))) {
      res.status(403).json({ success: false, message: 'Library staff access required.' });
      return;
    }

    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const students = await prisma.user.findMany({
      where: {
        role: 'student',
        OR: [
          { fullName: { contains: q } },
          { email: { contains: q } },
          { profile: { rollNumber: { contains: q } } },
        ],
      },
      take: 10,
      select: {
        id: true, fullName: true, email: true,
        profile: { select: { rollNumber: true, course: true, year: true, section: true } },
      },
    });

    res.json({ success: true, data: students });
  } catch (err) {
    console.error('searchStudents error:', err);
    res.status(500).json({ success: false, message: 'Failed to search students.' });
  }
}

// ─── PATCH /api/library/staff/:userId — Toggle librarian flag (admin) ─
export async function toggleLibrarian(req: Request, res: Response): Promise<void> {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required.' });
      return;
    }

    const targetId = String(req.params.userId);
    const { isLibrarian } = req.body;
    if (typeof isLibrarian !== 'boolean') {
      res.status(400).json({ success: false, message: 'isLibrarian (boolean) required.' });
      return;
    }

    // Ensure profile exists
    let profile = await prisma.profile.findUnique({ where: { userId: targetId } });
    if (!profile) {
      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }
      profile = await prisma.profile.create({
        data: {
          userId: targetId,
          idCardNumber: `SC-LIB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          isLibrarian,
        },
      });
    } else {
      profile = await prisma.profile.update({ where: { userId: targetId }, data: { isLibrarian } });
    }

    res.json({
      success: true,
      message: `User ${isLibrarian ? 'promoted to' : 'removed from'} Library Faculty.`,
      data: profile,
    });
  } catch (err) {
    console.error('toggleLibrarian error:', err);
    res.status(500).json({ success: false, message: 'Failed to update librarian status.' });
  }
}
