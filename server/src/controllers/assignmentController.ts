import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET assignments for a classroom
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.classroomId as string;
    const userId = req.user?.userId as string;
    const role = req.user?.role as string;
    const assignments = await prisma.assignment.findMany({
      where: { classroomId },
      include: { createdBy: { select: { fullName: true } }, submissions: role === 'faculty' || role === 'admin' ? { include: { student: { select: { fullName: true, profile: { select: { rollNumber: true } } } } } } : { where: { studentId: userId }, select: { id: true, submittedAt: true, grade: true, feedback: true, solutionFileName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: assignments });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST create assignment (faculty only)
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') return res.status(403).json({ success: false, message: 'Faculty only' });
    const classroomId = req.params.classroomId as string;
    const { title, description, pdfBase64, pdfFileName, dueDate } = req.body;
    const a = await prisma.assignment.create({
      data: { classroomId, title, description, pdfBase64, pdfFileName, dueDate: dueDate ? new Date(dueDate) : null, createdById: req.user!.userId as string },
    });
    res.json({ success: true, data: a });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST submit solution (student only)
export const submitSolution = async (req: Request, res: Response) => {
  try {
    const assignmentId = req.params.assignmentId as string;
    const studentId = req.user?.userId as string;
    const { solutionBase64, solutionFileName } = req.body;
    if (!solutionBase64 || !solutionFileName) return res.status(400).json({ success: false, message: 'Solution file required' });
    const sub = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      create: { assignmentId, studentId, solutionBase64, solutionFileName },
      update: { solutionBase64, solutionFileName, submittedAt: new Date() },
    });
    res.json({ success: true, data: sub });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// GET download submission (faculty only — ensures privacy)
export const getSubmission = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') return res.status(403).json({ success: false, message: 'Faculty only' });
    const sub = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId as string }, include: { student: { select: { fullName: true } } } });
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: sub });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT grade submission (faculty only)
export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') return res.status(403).json({ success: false, message: 'Faculty only' });
    const { grade, feedback } = req.body;
    const sub = await prisma.assignmentSubmission.update({ where: { id: req.params.submissionId as string }, data: { grade, feedback } });
    res.json({ success: true, data: sub });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
