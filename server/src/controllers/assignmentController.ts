import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// GET assignments for a classroom
export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const classroomId = req.params.classroomId as string;
    const userId = req.user?.userId as string;
    const role = req.user?.role as string;

    const assignments = await prisma.assignment.findMany({
      where: { classroomId },
      include: {
        createdBy: { select: { fullName: true } },
        submissions:
          role === 'faculty' || role === 'admin'
            ? { include: { student: { select: { fullName: true, profile: { select: { rollNumber: true } } } } } }
            : { where: { studentId: userId }, select: { id: true, submittedAt: true, grade: true, feedback: true, solutionFileName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: assignments });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST create assignment (faculty only)
export const createAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') {
      res.status(403).json({ success: false, message: 'Faculty only' });
      return;
    }

    const classroomId = req.params.classroomId as string;
    const { title, description, pdfBase64, pdfFileName, dueDate } = req.body;

    if (!title) {
      res.status(400).json({ success: false, message: 'title is required' });
      return;
    }

    const assignment = await prisma.assignment.create({
      data: {
        classroomId,
        title,
        description,
        pdfBase64,
        pdfFileName,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST submit solution (student only)
export const submitSolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const assignmentId = req.params.assignmentId as string;
    const studentId = req.user?.userId as string;
    const { solutionBase64, solutionFileName } = req.body;

    if (!solutionBase64 || !solutionFileName) {
      res.status(400).json({ success: false, message: 'Solution file required' });
      return;
    }

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      create: { assignmentId, studentId, solutionBase64, solutionFileName },
      update: { solutionBase64, solutionFileName, submittedAt: new Date() },
    });

    res.json({ success: true, data: submission });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET download submission (faculty only — ensures privacy)
export const getSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') {
      res.status(403).json({ success: false, message: 'Faculty only' });
      return;
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: req.params.submissionId as string },
      include: { student: { select: { fullName: true } } },
    });

    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    res.json({ success: true, data: submission });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PUT grade submission (faculty only)
export const gradeSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') {
      res.status(403).json({ success: false, message: 'Faculty only' });
      return;
    }

    const { grade, feedback } = req.body;
    const submission = await prisma.assignmentSubmission.update({
      where: { id: req.params.submissionId as string },
      data: { grade, feedback },
    });

    res.json({ success: true, data: submission });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
