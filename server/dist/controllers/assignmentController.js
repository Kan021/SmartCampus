"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeSubmission = exports.getSubmission = exports.submitSolution = exports.createAssignment = exports.getAssignments = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// GET assignments for a classroom
const getAssignments = async (req, res) => {
    try {
        const classroomId = req.params.classroomId;
        const userId = req.user?.userId;
        const role = req.user?.role;
        const assignments = await prisma.assignment.findMany({
            where: { classroomId },
            include: { createdBy: { select: { fullName: true } }, submissions: role === 'faculty' || role === 'admin' ? { include: { student: { select: { fullName: true, profile: { select: { rollNumber: true } } } } } } : { where: { studentId: userId }, select: { id: true, submittedAt: true, grade: true, feedback: true, solutionFileName: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: assignments });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getAssignments = getAssignments;
// POST create assignment (faculty only)
const createAssignment = async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'faculty' && role !== 'admin')
            return res.status(403).json({ success: false, message: 'Faculty only' });
        const classroomId = req.params.classroomId;
        const { title, description, pdfBase64, pdfFileName, dueDate } = req.body;
        const a = await prisma.assignment.create({
            data: { classroomId, title, description, pdfBase64, pdfFileName, dueDate: dueDate ? new Date(dueDate) : null, createdById: req.user.userId },
        });
        res.json({ success: true, data: a });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createAssignment = createAssignment;
// POST submit solution (student only)
const submitSolution = async (req, res) => {
    try {
        const assignmentId = req.params.assignmentId;
        const studentId = req.user?.userId;
        const { solutionBase64, solutionFileName } = req.body;
        if (!solutionBase64 || !solutionFileName)
            return res.status(400).json({ success: false, message: 'Solution file required' });
        const sub = await prisma.assignmentSubmission.upsert({
            where: { assignmentId_studentId: { assignmentId, studentId } },
            create: { assignmentId, studentId, solutionBase64, solutionFileName },
            update: { solutionBase64, solutionFileName, submittedAt: new Date() },
        });
        res.json({ success: true, data: sub });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.submitSolution = submitSolution;
// GET download submission (faculty only — ensures privacy)
const getSubmission = async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'faculty' && role !== 'admin')
            return res.status(403).json({ success: false, message: 'Faculty only' });
        const sub = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId }, include: { student: { select: { fullName: true } } } });
        if (!sub)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: sub });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getSubmission = getSubmission;
// PUT grade submission (faculty only)
const gradeSubmission = async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'faculty' && role !== 'admin')
            return res.status(403).json({ success: false, message: 'Faculty only' });
        const { grade, feedback } = req.body;
        const sub = await prisma.assignmentSubmission.update({ where: { id: req.params.submissionId }, data: { grade, feedback } });
        res.json({ success: true, data: sub });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.gradeSubmission = gradeSubmission;
//# sourceMappingURL=assignmentController.js.map