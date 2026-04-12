import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { notifyClassroomMembersAboutNote, notifyClassroomMembersAboutMessage } from '../services/notificationService';

// GET /api/classroom/my — get user's classroom (admin gets list of all)
export const getMyClassroom = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Admin sees ALL classrooms — returns list for picker
    if (userRole === 'admin') {
      const classrooms = await prisma.classroom.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { members: true } } },
      });
      return res.json({ success: true, data: { isAdmin: true, classrooms } });
    }

    // Student/Faculty: auto-join by section
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile || !profile.section || !profile.course) {
      return res.status(400).json({ success: false, message: 'Please set your course and section in your profile first.' });
    }

    const classroomName = `${profile.course}${profile.section}`;

    let classroom = await prisma.classroom.findUnique({ where: { name: classroomName } });
    if (!classroom) {
      classroom = await prisma.classroom.create({
        data: { name: classroomName, course: profile.course, section: profile.section },
      });
    }

    const existing = await prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId: classroom.id, userId } },
    });
    if (!existing) {
      await prisma.classroomMember.create({
        data: { classroomId: classroom.id, userId, role: userRole === 'faculty' ? 'faculty' : 'student' },
      });
    }

    return res.json({ success: true, data: { isAdmin: false, classroom } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/classroom/create — admin creates a classroom
export const createClassroom = async (req: Request, res: Response) => {
  try {
    const { course, section } = req.body;
    if (!course || !section) {
      return res.status(400).json({ success: false, message: 'Course and section are required.' });
    }
    const name = `${course}${section}`;
    const existing = await prisma.classroom.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Classroom ${name} already exists.` });
    }
    const classroom = await prisma.classroom.create({
      data: { name, course, section },
    });
    return res.status(201).json({ success: true, message: `Classroom ${name} created.`, data: { classroom } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/classroom/:id/members
export const getMembers = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const members = await prisma.classroomMember.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/classroom/:id/notes
export const getNotes = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const notes = await prisma.classNote.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/classroom/:id/notes
export const uploadNote = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const userId = req.user!.userId;
    const { title, description, fileName, fileBase64, fileType } = req.body;

    if (!title || !fileName || !fileBase64 || !fileType) {
      return res.status(400).json({ success: false, message: 'Title, file name, file data and type are required.' });
    }

    const note = await prisma.classNote.create({
      data: { classroomId, uploaderId: userId, title, description, fileName, fileBase64, fileType },
    });

    // Fire-and-forget: notify classroom members about the new note
    const uploader = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    notifyClassroomMembersAboutNote(
      classroomId,
      { title, description: description || null },
      uploader?.fullName || 'Faculty',
    );

    return res.status(201).json({ success: true, message: 'Note uploaded.', data: { note: { id: note.id, title: note.title } } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/classroom/:id/notes/:noteId/download
export const downloadNote = async (req: Request, res: Response) => {
  try {
    const noteId = req.params.noteId as string;
    const note = await prisma.classNote.findUnique({ where: { id: noteId } });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    return res.json({ success: true, data: { fileBase64: note.fileBase64, fileName: note.fileName, fileType: note.fileType } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/classroom/:id/notes/:noteId
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const noteId = req.params.noteId as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const note = await prisma.classNote.findUnique({ where: { id: noteId } });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    if (note.uploaderId !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the uploader or admin can delete.' });
    }
    await prisma.classNote.delete({ where: { id: noteId } });
    return res.json({ success: true, message: 'Note deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/classroom/:id/messages
export const getMessages = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const messages = await prisma.classMessage.findMany({
      where: { classroomId },
      include: { sender: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { messages } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/classroom/:id/messages — faculty/admin only
export const postMessage = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { content } = req.body;

    if (userRole === 'student') return res.status(403).json({ success: false, message: 'Only faculty can post messages.' });
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message content required.' });

    const msg = await prisma.classMessage.create({
      data: { classroomId, senderId: userId, content: content.trim() },
      include: { sender: { select: { fullName: true, role: true } } },
    });

    // Fire-and-forget: notify classroom members about the new message
    notifyClassroomMembersAboutMessage(
      classroomId,
      { content: content.trim() },
      msg.sender.fullName,
    );

    return res.status(201).json({ success: true, message: 'Message posted.', data: { message: msg } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/classroom/:id/join-faculty — admin assigns faculty
export const joinFaculty = async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'faculty') return res.status(400).json({ success: false, message: 'User is not a faculty.' });

    const existing = await prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId, userId } },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Already a member.' });

    await prisma.classroomMember.create({ data: { classroomId, userId, role: 'faculty' } });
    return res.status(201).json({ success: true, message: 'Faculty added.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
