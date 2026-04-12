import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import {
  createSubjectSchema,
  uploadMarkSchema,
  bulkUploadMarksSchema,
  createFeeStructureSchema,
  markFeePaymentSchema,
  createEventSchema,
} from '../types/academics.types';

// ═══════════════════════════════════════════════════════════════
//  SUBJECTS
// ═══════════════════════════════════════════════════════════════

/** GET /api/academics/subjects */
export async function getSubjects(req: Request, res: Response): Promise<void> {
  try {
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const department = req.query.department as string | undefined;

    const where: any = {};
    if (semester) where.semester = semester;
    if (department) where.department = department;

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: subjects });
  } catch (err) {
    console.error('getSubjects error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects.' });
  }
}

/** POST /api/academics/subjects — Admin only */
export async function createSubject(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const subject = await prisma.subject.create({ data: parsed.data });
    res.status(201).json({ success: true, message: 'Subject created.', data: subject });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Subject code already exists.' });
      return;
    }
    console.error('createSubject error:', err);
    res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  MARKS
// ═══════════════════════════════════════════════════════════════

function calculateGrade(percentage: number): { grade: string; result: string } {
  if (percentage >= 90) return { grade: 'O', result: 'pass' };
  if (percentage >= 80) return { grade: 'A+', result: 'pass' };
  if (percentage >= 70) return { grade: 'A', result: 'pass' };
  if (percentage >= 60) return { grade: 'B+', result: 'pass' };
  if (percentage >= 50) return { grade: 'B', result: 'pass' };
  if (percentage >= 40) return { grade: 'C', result: 'pass' };
  if (percentage >= 33) return { grade: 'D', result: 'pass' };
  return { grade: 'F', result: 'fail' };
}

function gradeToPoints(grade: string): number {
  const map: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'D': 4, 'F': 0 };
  return map[grade] ?? 0;
}

/** GET /api/academics/marks/my — Student's marks */
export async function getMyMarks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const marks = await prisma.subjectMark.findMany({
      where: { studentId: userId },
      include: { subject: true },
      orderBy: [{ semester: 'asc' }, { subject: { name: 'asc' } }],
    });

    // Group by semester and calculate SGPA
    const semesters: Record<number, any> = {};
    for (const m of marks) {
      if (!semesters[m.semester]) {
        semesters[m.semester] = { semester: m.semester, subjects: [], totalCredits: 0, weightedPoints: 0 };
      }
      const s = semesters[m.semester];
      const points = gradeToPoints(m.grade);
      s.subjects.push(m);
      s.totalCredits += m.subject.credits;
      s.weightedPoints += points * m.subject.credits;
    }

    const result = Object.values(semesters).map((s: any) => ({
      ...s,
      sgpa: s.totalCredits > 0 ? +(s.weightedPoints / s.totalCredits).toFixed(2) : 0,
    }));

    // Calculate CGPA
    let totalCredits = 0, totalWeighted = 0;
    for (const s of Object.values(semesters) as any[]) {
      totalCredits += s.totalCredits;
      totalWeighted += s.weightedPoints;
    }
    const cgpa = totalCredits > 0 ? +(totalWeighted / totalCredits).toFixed(2) : 0;

    res.json({ success: true, data: { semesters: result, cgpa } });
  } catch (err) {
    console.error('getMyMarks error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch marks.' });
  }
}

/** POST /api/academics/marks — Upload single mark */
export async function uploadMark(req: Request, res: Response): Promise<void> {
  try {
    const parsed = uploadMarkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { studentId, subjectId, internal, external, semester } = parsed.data;

    // Look up subject for max marks
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      res.status(404).json({ success: false, message: 'Subject not found.' });
      return;
    }

    const total = internal + external;
    const maxTotal = subject.maxInternal + subject.maxExternal;
    const percentage = (total / maxTotal) * 100;
    const { grade, result } = calculateGrade(percentage);

    const mark = await prisma.subjectMark.upsert({
      where: { studentId_subjectId: { studentId, subjectId } },
      create: { studentId, subjectId, internal, external, total, grade, result, semester },
      update: { internal, external, total, grade, result, semester },
    });

    res.json({ success: true, message: 'Mark saved.', data: mark });
  } catch (err) {
    console.error('uploadMark error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload mark.' });
  }
}

/** POST /api/academics/marks/bulk — Bulk upload */
export async function bulkUploadMarks(req: Request, res: Response): Promise<void> {
  try {
    const parsed = bulkUploadMarksSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const results = [];
    for (const entry of parsed.data.marks) {
      const subject = await prisma.subject.findUnique({ where: { id: entry.subjectId } });
      if (!subject) continue;

      const total = entry.internal + entry.external;
      const maxTotal = subject.maxInternal + subject.maxExternal;
      const percentage = (total / maxTotal) * 100;
      const { grade, result } = calculateGrade(percentage);

      const mark = await prisma.subjectMark.upsert({
        where: { studentId_subjectId: { studentId: entry.studentId, subjectId: entry.subjectId } },
        create: { ...entry, total, grade, result },
        update: { internal: entry.internal, external: entry.external, total, grade, result, semester: entry.semester },
      });
      results.push(mark);
    }

    res.json({ success: true, message: `${results.length} marks uploaded.`, data: results });
  } catch (err) {
    console.error('bulkUploadMarks error:', err);
    res.status(500).json({ success: false, message: 'Failed to bulk upload marks.' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/** GET /api/academics/fees/structures */
export async function getFeeStructures(req: Request, res: Response): Promise<void> {
  try {
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const course = req.query.course as string | undefined;
    const where: any = {};
    if (semester) where.semester = semester;
    if (course) where.course = course;

    const structures = await prisma.feeStructure.findMany({
      where,
      orderBy: [{ year: 'desc' }, { semester: 'asc' }, { category: 'asc' }],
    });
    res.json({ success: true, data: structures });
  } catch (err) {
    console.error('getFeeStructures error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fee structures.' });
  }
}

/** POST /api/academics/fees/structures — Admin only */
export async function createFeeStructure(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createFeeStructureSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const data: any = { ...parsed.data };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    const structure = await prisma.feeStructure.create({ data });
    res.status(201).json({ success: true, message: 'Fee structure created.', data: structure });
  } catch (err) {
    console.error('createFeeStructure error:', err);
    res.status(500).json({ success: false, message: 'Failed to create fee structure.' });
  }
}

/** GET /api/academics/fees/my — Student's fee payments */
export async function getMyFees(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const payments = await prisma.feePayment.findMany({
      where: { studentId: userId },
      include: { feeStructure: true },
      orderBy: { createdAt: 'desc' },
    });

    // Also list all fee structures (so student can see what's unpaid)
    const allStructures = await prisma.feeStructure.findMany({ orderBy: [{ year: 'desc' }, { semester: 'asc' }] });
    const paidMap = new Map(payments.map(p => [p.feeStructureId, p]));

    const feeStatus = allStructures.map(fs => ({
      ...fs,
      payment: paidMap.get(fs.id) || null,
      status: paidMap.get(fs.id)?.status || 'pending',
    }));

    res.json({ success: true, data: { fees: feeStatus, payments } });
  } catch (err) {
    console.error('getMyFees error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fees.' });
  }
}

/** POST /api/academics/fees/pay — Admin marks payment */
export async function markFeePayment(req: Request, res: Response): Promise<void> {
  try {
    const parsed = markFeePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { studentId, feeStructureId, amountPaid, transactionRef, remarks } = parsed.data;

    const payment = await prisma.feePayment.upsert({
      where: { studentId_feeStructureId: { studentId, feeStructureId } },
      create: { studentId, feeStructureId, amountPaid, status: 'paid', paidAt: new Date(), transactionRef, remarks },
      update: { amountPaid, status: 'paid', paidAt: new Date(), transactionRef, remarks },
    });

    res.json({ success: true, message: 'Fee payment marked.', data: payment });
  } catch (err) {
    console.error('markFeePayment error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark payment.' });
  }
}

/** GET /api/academics/fees/summary — Admin fee collection summary */
export async function getFeeSummary(req: Request, res: Response): Promise<void> {
  try {
    const structures = await prisma.feeStructure.findMany({
      include: { payments: true },
      orderBy: [{ year: 'desc' }, { semester: 'asc' }],
    });

    const summary = structures.map(fs => {
      const totalPaid = fs.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amountPaid, 0);
      const paidCount = fs.payments.filter(p => p.status === 'paid').length;
      const pendingCount = fs.payments.filter(p => p.status !== 'paid').length;
      return {
        id: fs.id, semester: fs.semester, year: fs.year, course: fs.course,
        category: fs.category, amount: fs.amount, totalPaid, paidCount, pendingCount,
      };
    });

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('getFeeSummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fee summary.' });
  }
}

/** POST /api/academics/fees/receipt — Student uploads receipt */
export async function uploadFeeReceipt(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { feeStructureId, receiptBase64, receiptFileName } = req.body;
    if (!feeStructureId || !receiptBase64 || !receiptFileName) {
      res.status(400).json({ success: false, message: 'feeStructureId, receiptBase64, receiptFileName required' });
      return;
    }
    const payment = await prisma.feePayment.upsert({
      where: { studentId_feeStructureId: { studentId: userId, feeStructureId } },
      create: { studentId: userId, feeStructureId, amountPaid: 0, status: 'pending', receiptBase64, receiptFileName, receiptStatus: 'pending' },
      update: { receiptBase64, receiptFileName, receiptStatus: 'pending' },
    });
    res.json({ success: true, message: 'Receipt uploaded for review.', data: payment });
  } catch (err) {
    console.error('uploadFeeReceipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload receipt.' });
  }
}

/** PUT /api/academics/fees/receipt/:paymentId/review — Admin approves/rejects */
export async function reviewFeeReceipt(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    if (role !== 'admin' && role !== 'faculty') {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
    const paymentId = req.params.paymentId as string;
    const { action } = req.body; // 'approved' | 'rejected'
    if (action !== 'approved' && action !== 'rejected') {
      res.status(400).json({ success: false, message: 'action must be approved or rejected' });
      return;
    }
    const data: any = { receiptStatus: action, approvedById: req.user!.userId, approvedAt: new Date() };
    if (action === 'approved') { data.status = 'paid'; data.paidAt = new Date(); }
    const payment = await prisma.feePayment.update({ where: { id: paymentId }, data });
    res.json({ success: true, message: `Receipt ${action}.`, data: payment });
  } catch (err) {
    console.error('reviewFeeReceipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to review receipt.' });
  }
}

/** GET /api/academics/fees/receipts/pending — Admin gets all pending receipts */
export async function getPendingReceipts(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    if (role !== 'admin' && role !== 'faculty') {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
    const pending = await prisma.feePayment.findMany({
      where: { receiptStatus: 'pending' },
      include: { student: { select: { fullName: true, email: true } }, feeStructure: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: pending });
  } catch (err) {
    console.error('getPendingReceipts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending receipts.' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  ACADEMIC CALENDAR
// ═══════════════════════════════════════════════════════════════

/** GET /api/academics/calendar */
export async function getCalendarEvents(req: Request, res: Response): Promise<void> {
  try {
    const events = await prisma.academicEvent.findMany({
      orderBy: { date: 'asc' },
      include: { creator: { select: { fullName: true } } },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('getCalendarEvents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch events.' });
  }
}

/** POST /api/academics/calendar — Admin */
export async function createCalendarEvent(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const data: any = { ...parsed.data, createdBy: req.user!.userId };
    data.date = new Date(data.date);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const event = await prisma.academicEvent.create({ data });
    res.status(201).json({ success: true, message: 'Event created.', data: event });
  } catch (err) {
    console.error('createCalendarEvent error:', err);
    res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
}

/** DELETE /api/academics/calendar/:id — Admin */
export async function deleteCalendarEvent(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.academicEvent.delete({ where: { id } });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    console.error('deleteCalendarEvent error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
}
