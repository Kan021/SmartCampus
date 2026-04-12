"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBooks = getBooks;
exports.createBook = createBook;
exports.updateBook = updateBook;
exports.deleteBook = deleteBook;
exports.getMyIssues = getMyIssues;
exports.getAllIssues = getAllIssues;
exports.issueBook = issueBook;
exports.returnBook = returnBook;
exports.updatePenalty = updatePenalty;
exports.getLibraryStats = getLibraryStats;
exports.searchStudents = searchStudents;
exports.toggleLibrarian = toggleLibrarian;
const prisma_1 = require("../utils/prisma");
const library_types_1 = require("../types/library.types");
const PENALTY_RATE_DEFAULT = 2; // Rs per day
// ─── Helper: check if user is library staff (librarian or admin) ──
async function isLibraryStaff(userId, role) {
    if (role === 'admin')
        return true;
    if (role !== 'faculty')
        return false;
    const profile = await prisma_1.prisma.profile.findUnique({ where: { userId }, select: { isLibrarian: true } });
    return !!profile?.isLibrarian;
}
// ─── Helper: compute live penalty from due date ───────────────────
function computePenalty(dueDate, returnDate, rate) {
    const checkDate = returnDate ?? new Date();
    const msDiff = checkDate.getTime() - dueDate.getTime();
    if (msDiff <= 0)
        return 0;
    const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    return days * rate;
}
// ─── GET /api/library/books — Book catalogue (all roles) ─────────
async function getBooks(req, res) {
    try {
        const { category, search, page = '1', limit = '30' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (category && category !== 'all')
            where.category = category;
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { author: { contains: search } },
                { isbn: { contains: search } },
            ];
        }
        const [books, total] = await Promise.all([
            prisma_1.prisma.book.findMany({ where, skip, take: parseInt(limit), orderBy: { title: 'asc' } }),
            prisma_1.prisma.book.count({ where }),
        ]);
        res.json({ success: true, data: { books, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
    }
    catch (err) {
        console.error('getBooks error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch books.' });
    }
}
// ─── POST /api/library/books — Add book (librarian/admin) ────────
async function createBook(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const parsed = library_types_1.createBookSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const { totalCopies, ...rest } = parsed.data;
        const book = await prisma_1.prisma.book.create({
            data: { ...rest, totalCopies, availableCopies: totalCopies },
        });
        res.status(201).json({ success: true, message: 'Book added to catalogue.', data: book });
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ success: false, message: 'A book with this ISBN already exists.' });
            return;
        }
        console.error('createBook error:', err);
        res.status(500).json({ success: false, message: 'Failed to add book.' });
    }
}
// ─── PUT /api/library/books/:id — Update book (librarian/admin) ──
async function updateBook(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const id = String(req.params.id);
        const parsed = library_types_1.updateBookSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const book = await prisma_1.prisma.book.update({ where: { id }, data: parsed.data });
        res.json({ success: true, message: 'Book updated.', data: book });
    }
    catch (err) {
        console.error('updateBook error:', err);
        res.status(500).json({ success: false, message: 'Failed to update book.' });
    }
}
// ─── DELETE /api/library/books/:id — Delete book (admin only) ────
async function deleteBook(req, res) {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Admin access required.' });
            return;
        }
        const id = String(req.params.id);
        await prisma_1.prisma.book.delete({ where: { id } });
        res.json({ success: true, message: 'Book removed from catalogue.' });
    }
    catch (err) {
        console.error('deleteBook error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete book.' });
    }
}
// ─── GET /api/library/my-issues — Student's issued books ─────────
async function getMyIssues(req, res) {
    try {
        const { userId } = req.user;
        const issues = await prisma_1.prisma.bookIssue.findMany({
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
            const isOverdue = issue.status !== 'returned' && new Date() > issue.dueDate;
            return { ...issue, livePenalty, isOverdue };
        });
        res.json({ success: true, data: enriched });
    }
    catch (err) {
        console.error('getMyIssues error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch your library records.' });
    }
}
// ─── GET /api/library/issues — All issues (librarian/admin) ──────
async function getAllIssues(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const { status, studentId, bookId, page = '1', limit = '30' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (status && status !== 'all')
            where.status = status;
        if (studentId)
            where.studentId = studentId;
        if (bookId)
            where.bookId = bookId;
        // Auto-update overdue statuses
        await prisma_1.prisma.bookIssue.updateMany({
            where: { status: 'issued', dueDate: { lt: new Date() } },
            data: { status: 'overdue' },
        });
        const [issues, total] = await Promise.all([
            prisma_1.prisma.bookIssue.findMany({
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
            prisma_1.prisma.bookIssue.count({ where }),
        ]);
        // Enrich with live penalty
        const enriched = issues.map((issue) => {
            const livePenalty = issue.status !== 'returned'
                ? computePenalty(issue.dueDate, null, issue.penaltyRate)
                : issue.penaltyAmount;
            return { ...issue, livePenalty };
        });
        res.json({ success: true, data: { issues: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
    }
    catch (err) {
        console.error('getAllIssues error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch issues.' });
    }
}
// ─── POST /api/library/issue — Issue a book (librarian/admin) ────
async function issueBook(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const parsed = library_types_1.issueBookSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const { bookId, studentId, dueDate, remarks, penaltyRate } = parsed.data;
        // Check book availability
        const book = await prisma_1.prisma.book.findUnique({ where: { id: bookId } });
        if (!book) {
            res.status(404).json({ success: false, message: 'Book not found.' });
            return;
        }
        if (book.availableCopies <= 0) {
            res.status(409).json({ success: false, message: 'No copies available for this book.' });
            return;
        }
        // Check student exists
        const student = await prisma_1.prisma.user.findUnique({ where: { id: studentId, role: 'student' } });
        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found.' });
            return;
        }
        // Check student doesn't already have this book unreturned
        const existing = await prisma_1.prisma.bookIssue.findFirst({
            where: { bookId, studentId, status: { in: ['issued', 'overdue'] } },
        });
        if (existing) {
            res.status(409).json({ success: false, message: 'Student already has this book issued.' });
            return;
        }
        // Create issue and decrement available copies (transaction)
        const [issue] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.bookIssue.create({
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
            prisma_1.prisma.book.update({
                where: { id: bookId },
                data: { availableCopies: { decrement: 1 } },
            }),
        ]);
        res.status(201).json({ success: true, message: `"${book.title}" issued to ${student.fullName}.`, data: issue });
    }
    catch (err) {
        console.error('issueBook error:', err);
        res.status(500).json({ success: false, message: 'Failed to issue book.' });
    }
}
// ─── PUT /api/library/issues/:id/return — Return a book ──────────
async function returnBook(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const id = String(req.params.id);
        const issue = await prisma_1.prisma.bookIssue.findUnique({ where: { id }, include: { book: true } });
        if (!issue) {
            res.status(404).json({ success: false, message: 'Issue record not found.' });
            return;
        }
        if (issue.status === 'returned') {
            res.status(409).json({ success: false, message: 'Book already returned.' });
            return;
        }
        const parsed = library_types_1.returnBookSchema.safeParse(req.body);
        const remarks = parsed.success ? parsed.data.remarks : undefined;
        const now = new Date();
        const finalPenalty = computePenalty(issue.dueDate, now, issue.penaltyRate);
        const [updated] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.bookIssue.update({
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
            prisma_1.prisma.book.update({
                where: { id: issue.bookId },
                data: { availableCopies: { increment: 1 } },
            }),
        ]);
        res.json({
            success: true,
            message: `Book returned successfully.${finalPenalty > 0 ? ` Penalty: ₹${finalPenalty}` : ''}`,
            data: updated,
        });
    }
    catch (err) {
        console.error('returnBook error:', err);
        res.status(500).json({ success: false, message: 'Failed to process return.' });
    }
}
// ─── PATCH /api/library/issues/:id/penalty — Mark penalty paid ───
async function updatePenalty(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const id = String(req.params.id);
        const parsed = library_types_1.markPenaltyPaidSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Invalid payload.' });
            return;
        }
        const updated = await prisma_1.prisma.bookIssue.update({
            where: { id },
            data: { penaltyPaid: parsed.data.penaltyPaid },
            include: { book: { select: { title: true } }, student: { select: { fullName: true } } },
        });
        res.json({ success: true, message: `Penalty marked as ${parsed.data.penaltyPaid ? 'paid' : 'unpaid'}.`, data: updated });
    }
    catch (err) {
        console.error('updatePenalty error:', err);
        res.status(500).json({ success: false, message: 'Failed to update penalty.' });
    }
}
// ─── GET /api/library/stats — Library statistics (librarian/admin) ─
async function getLibraryStats(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        // Auto-update overdue
        await prisma_1.prisma.bookIssue.updateMany({
            where: { status: 'issued', dueDate: { lt: new Date() } },
            data: { status: 'overdue' },
        });
        const [totalBooks, totalCopies, issuedCount, overdueCount, returnedCount, unpaidPenaltyCount,] = await Promise.all([
            prisma_1.prisma.book.count(),
            prisma_1.prisma.book.aggregate({ _sum: { totalCopies: true } }),
            prisma_1.prisma.bookIssue.count({ where: { status: 'issued' } }),
            prisma_1.prisma.bookIssue.count({ where: { status: 'overdue' } }),
            prisma_1.prisma.bookIssue.count({ where: { status: 'returned' } }),
            prisma_1.prisma.bookIssue.count({ where: { penaltyPaid: false, penaltyAmount: { gt: 0 } } }),
        ]);
        const penaltySum = await prisma_1.prisma.bookIssue.aggregate({
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
    }
    catch (err) {
        console.error('getLibraryStats error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
    }
}
// ─── GET /api/library/students — Search students for issue form ───
async function searchStudents(req, res) {
    try {
        const { userId, role } = req.user;
        if (!(await isLibraryStaff(userId, role))) {
            res.status(403).json({ success: false, message: 'Library staff access required.' });
            return;
        }
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            res.json({ success: true, data: [] });
            return;
        }
        const students = await prisma_1.prisma.user.findMany({
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
    }
    catch (err) {
        console.error('searchStudents error:', err);
        res.status(500).json({ success: false, message: 'Failed to search students.' });
    }
}
// ─── PATCH /api/library/staff/:userId — Toggle librarian flag (admin) ─
async function toggleLibrarian(req, res) {
    try {
        if (req.user.role !== 'admin') {
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
        let profile = await prisma_1.prisma.profile.findUnique({ where: { userId: targetId } });
        if (!profile) {
            const user = await prisma_1.prisma.user.findUnique({ where: { id: targetId } });
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found.' });
                return;
            }
            profile = await prisma_1.prisma.profile.create({
                data: {
                    userId: targetId,
                    idCardNumber: `SC-LIB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                    isLibrarian,
                },
            });
        }
        else {
            profile = await prisma_1.prisma.profile.update({ where: { userId: targetId }, data: { isLibrarian } });
        }
        res.json({
            success: true,
            message: `User ${isLibrarian ? 'promoted to' : 'removed from'} Library Faculty.`,
            data: profile,
        });
    }
    catch (err) {
        console.error('toggleLibrarian error:', err);
        res.status(500).json({ success: false, message: 'Failed to update librarian status.' });
    }
}
//# sourceMappingURL=libraryController.js.map