"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinFaculty = exports.postMessage = exports.getMessages = exports.deleteNote = exports.downloadNote = exports.uploadNote = exports.getNotes = exports.getMembers = exports.createClassroom = exports.getMyClassroom = void 0;
const prisma_1 = require("../utils/prisma");
const notificationService_1 = require("../services/notificationService");
// GET /api/classroom/my — get user's classroom (admin gets list of all)
const getMyClassroom = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        // Admin sees ALL classrooms — returns list for picker
        if (userRole === 'admin') {
            const classrooms = await prisma_1.prisma.classroom.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { members: true } } },
            });
            return res.json({ success: true, data: { isAdmin: true, classrooms } });
        }
        // Student/Faculty: auto-join by section
        const profile = await prisma_1.prisma.profile.findUnique({ where: { userId } });
        if (!profile || !profile.section || !profile.course) {
            return res.status(400).json({ success: false, message: 'Please set your course and section in your profile first.' });
        }
        const classroomName = `${profile.course}${profile.section}`;
        let classroom = await prisma_1.prisma.classroom.findUnique({ where: { name: classroomName } });
        if (!classroom) {
            classroom = await prisma_1.prisma.classroom.create({
                data: { name: classroomName, course: profile.course, section: profile.section },
            });
        }
        const existing = await prisma_1.prisma.classroomMember.findUnique({
            where: { classroomId_userId: { classroomId: classroom.id, userId } },
        });
        if (!existing) {
            await prisma_1.prisma.classroomMember.create({
                data: { classroomId: classroom.id, userId, role: userRole === 'faculty' ? 'faculty' : 'student' },
            });
        }
        return res.json({ success: true, data: { isAdmin: false, classroom } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMyClassroom = getMyClassroom;
// POST /api/classroom/create — admin creates a classroom
const createClassroom = async (req, res) => {
    try {
        const { course, section } = req.body;
        if (!course || !section) {
            return res.status(400).json({ success: false, message: 'Course and section are required.' });
        }
        const name = `${course}${section}`;
        const existing = await prisma_1.prisma.classroom.findUnique({ where: { name } });
        if (existing) {
            return res.status(409).json({ success: false, message: `Classroom ${name} already exists.` });
        }
        const classroom = await prisma_1.prisma.classroom.create({
            data: { name, course, section },
        });
        return res.status(201).json({ success: true, message: `Classroom ${name} created.`, data: { classroom } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createClassroom = createClassroom;
// GET /api/classroom/:id/members
const getMembers = async (req, res) => {
    try {
        const classroomId = req.params.id;
        const members = await prisma_1.prisma.classroomMember.findMany({
            where: { classroomId },
            include: {
                user: {
                    select: {
                        id: true, fullName: true, email: true, role: true,
                        profile: {
                            select: {
                                avatarBase64: true, rollNumber: true, phone: true,
                                section: true, course: true, year: true, department: true,
                                designation: true, employeeId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
        return res.json({ success: true, data: { members } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMembers = getMembers;
// GET /api/classroom/:id/notes
const getNotes = async (req, res) => {
    try {
        const classroomId = req.params.id;
        const notes = await prisma_1.prisma.classNote.findMany({
            where: { classroomId },
            include: {
                uploader: { select: { fullName: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const list = notes.map(n => ({
            id: n.id, title: n.title, description: n.description,
            fileName: n.fileName, fileType: n.fileType,
            uploaderName: n.uploader.fullName, uploaderRole: n.uploader.role,
            createdAt: n.createdAt,
        }));
        return res.json({ success: true, data: { notes: list } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getNotes = getNotes;
// POST /api/classroom/:id/notes
const uploadNote = async (req, res) => {
    try {
        const classroomId = req.params.id;
        const userId = req.user.userId;
        const { title, description, fileName, fileBase64, fileType } = req.body;
        if (!title || !fileName || !fileBase64 || !fileType) {
            return res.status(400).json({ success: false, message: 'Title, file name, file data and type are required.' });
        }
        const note = await prisma_1.prisma.classNote.create({
            data: { classroomId, uploaderId: userId, title, description, fileName, fileBase64, fileType },
        });
        // Fire-and-forget: notify classroom members about the new note
        const uploader = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
        (0, notificationService_1.notifyClassroomMembersAboutNote)(classroomId, { title, description: description || null }, uploader?.fullName || 'Faculty');
        return res.status(201).json({ success: true, message: 'Note uploaded.', data: { note: { id: note.id, title: note.title } } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.uploadNote = uploadNote;
// GET /api/classroom/:id/notes/:noteId/download
const downloadNote = async (req, res) => {
    try {
        const noteId = req.params.noteId;
        const note = await prisma_1.prisma.classNote.findUnique({ where: { id: noteId } });
        if (!note)
            return res.status(404).json({ success: false, message: 'Note not found.' });
        return res.json({ success: true, data: { fileBase64: note.fileBase64, fileName: note.fileName, fileType: note.fileType } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.downloadNote = downloadNote;
// DELETE /api/classroom/:id/notes/:noteId
const deleteNote = async (req, res) => {
    try {
        const noteId = req.params.noteId;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const note = await prisma_1.prisma.classNote.findUnique({ where: { id: noteId } });
        if (!note)
            return res.status(404).json({ success: false, message: 'Note not found.' });
        if (note.uploaderId !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the uploader or admin can delete.' });
        }
        await prisma_1.prisma.classNote.delete({ where: { id: noteId } });
        return res.json({ success: true, message: 'Note deleted.' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteNote = deleteNote;
// GET /api/classroom/:id/messages
const getMessages = async (req, res) => {
    try {
        const classroomId = req.params.id;
        const messages = await prisma_1.prisma.classMessage.findMany({
            where: { classroomId },
            include: { sender: { select: { fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: { messages } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMessages = getMessages;
// POST /api/classroom/:id/messages — faculty/admin only
const postMessage = async (req, res) => {
    try {
        const classroomId = req.params.id;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { content } = req.body;
        if (userRole === 'student')
            return res.status(403).json({ success: false, message: 'Only faculty can post messages.' });
        if (!content?.trim())
            return res.status(400).json({ success: false, message: 'Message content required.' });
        const msg = await prisma_1.prisma.classMessage.create({
            data: { classroomId, senderId: userId, content: content.trim() },
            include: { sender: { select: { fullName: true, role: true } } },
        });
        // Fire-and-forget: notify classroom members about the new message
        (0, notificationService_1.notifyClassroomMembersAboutMessage)(classroomId, { content: content.trim() }, msg.sender.fullName);
        return res.status(201).json({ success: true, message: 'Message posted.', data: { message: msg } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.postMessage = postMessage;
// POST /api/classroom/:id/join-faculty — admin assigns faculty
const joinFaculty = async (req, res) => {
    try {
        const classroomId = req.params.id;
        const { userId } = req.body;
        if (!userId)
            return res.status(400).json({ success: false, message: 'userId required.' });
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== 'faculty')
            return res.status(400).json({ success: false, message: 'User is not a faculty.' });
        const existing = await prisma_1.prisma.classroomMember.findUnique({
            where: { classroomId_userId: { classroomId, userId } },
        });
        if (existing)
            return res.status(409).json({ success: false, message: 'Already a member.' });
        await prisma_1.prisma.classroomMember.create({ data: { classroomId, userId, role: 'faculty' } });
        return res.status(201).json({ success: true, message: 'Faculty added.' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.joinFaculty = joinFaculty;
//# sourceMappingURL=classroomController.js.map