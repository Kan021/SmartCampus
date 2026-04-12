"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.getEvents = getEvents;
exports.getEventById = getEventById;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.addEventFile = addEventFile;
exports.downloadEventFile = downloadEventFile;
exports.deleteEventFile = deleteEventFile;
const prisma_1 = require("../utils/prisma");
const event_types_1 = require("../types/event.types");
const AUTHOR_SELECT = { select: { id: true, fullName: true, role: true } };
const EVENT_LIST_SELECT = {
    id: true,
    title: true,
    description: true,
    venue: true,
    eventDate: true,
    endDate: true,
    category: true,
    organizerType: true,
    organizerName: true,
    clubName: true,
    clubContact: true,
    clubLogoBase64: true,
    facultyName: true,
    facultyPhone: true,
    facultyEmail: true,
    registrationLink: true,
    maxParticipants: true,
    tags: true,
    isPublished: true,
    createdAt: true,
    updatedAt: true,
    authorId: true,
    author: AUTHOR_SELECT,
    files: {
        select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSizeKb: true,
            createdAt: true,
            // Exclude heavy fileBase64 from list view
        },
        orderBy: { createdAt: 'asc' },
    },
};
// ─── POST /api/events — Create event (any authenticated user) ────────────────
async function createEvent(req, res) {
    try {
        const userId = req.user.userId;
        const parsed = event_types_1.createEventSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const data = parsed.data;
        const event = await prisma_1.prisma.event.create({
            data: {
                title: data.title,
                description: data.description,
                venue: data.venue,
                eventDate: new Date(data.eventDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                category: data.category,
                organizerType: data.organizerType,
                organizerName: data.organizerName,
                clubName: data.clubName ?? null,
                clubContact: data.clubContact ?? null,
                clubLogoBase64: data.clubLogoBase64 ?? null,
                facultyName: data.facultyName ?? null,
                facultyPhone: data.facultyPhone ?? null,
                facultyEmail: data.facultyEmail || null,
                registrationLink: data.registrationLink || null,
                maxParticipants: data.maxParticipants ?? null,
                tags: data.tags ?? '',
                isPublished: data.isPublished ?? true,
                authorId: userId,
            },
            select: EVENT_LIST_SELECT,
        });
        res.status(201).json({ success: true, message: 'Event created successfully.', data: event });
    }
    catch (err) {
        console.error('createEvent error:', err);
        res.status(500).json({ success: false, message: 'Failed to create event.' });
    }
}
// ─── GET /api/events — List all events (latest first, paginated) ─────────────
async function getEvents(req, res) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const category = req.query.category;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const where = { isPublished: true };
        if (category && category !== 'all')
            where.category = category;
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { organizerName: { contains: search } },
                { venue: { contains: search } },
                { tags: { contains: search } },
            ];
        }
        const [events, total] = await Promise.all([
            prisma_1.prisma.event.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: EVENT_LIST_SELECT,
            }),
            prisma_1.prisma.event.count({ where }),
        ]);
        res.json({
            success: true,
            data: {
                events,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch (err) {
        console.error('getEvents error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch events.' });
    }
}
// ─── GET /api/events/:id — Get single event with files (including base64) ────
async function getEventById(req, res) {
    try {
        const id = String(req.params.id);
        const event = await prisma_1.prisma.event.findUnique({
            where: { id },
            include: {
                author: AUTHOR_SELECT,
                files: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found.' });
            return;
        }
        res.json({ success: true, data: event });
    }
    catch (err) {
        console.error('getEventById error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch event.' });
    }
}
// ─── PUT /api/events/:id — Update event (author or admin) ───────────────────
async function updateEvent(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const existing = await prisma_1.prisma.event.findUnique({ where: { id }, select: { authorId: true } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Event not found.' });
            return;
        }
        if (userRole !== 'admin' && existing.authorId !== userId) {
            res.status(403).json({ success: false, message: 'You can only edit your own events.' });
            return;
        }
        const parsed = event_types_1.updateEventSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const data = parsed.data;
        const updateData = { ...data };
        if (data.eventDate)
            updateData.eventDate = new Date(data.eventDate);
        if (data.endDate)
            updateData.endDate = new Date(data.endDate);
        if (data.endDate === null)
            updateData.endDate = null;
        const event = await prisma_1.prisma.event.update({
            where: { id },
            data: updateData,
            select: EVENT_LIST_SELECT,
        });
        res.json({ success: true, message: 'Event updated.', data: event });
    }
    catch (err) {
        console.error('updateEvent error:', err);
        res.status(500).json({ success: false, message: 'Failed to update event.' });
    }
}
// ─── DELETE /api/events/:id — Delete event (author or admin) ────────────────
async function deleteEvent(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const existing = await prisma_1.prisma.event.findUnique({ where: { id }, select: { authorId: true } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Event not found.' });
            return;
        }
        if (userRole !== 'admin' && existing.authorId !== userId) {
            res.status(403).json({ success: false, message: 'You can only delete your own events.' });
            return;
        }
        await prisma_1.prisma.event.delete({ where: { id } });
        res.json({ success: true, message: 'Event deleted.' });
    }
    catch (err) {
        console.error('deleteEvent error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete event.' });
    }
}
// ─── POST /api/events/:id/files — Add file attachment ───────────────────────
async function addEventFile(req, res) {
    try {
        const eventId = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const event = await prisma_1.prisma.event.findUnique({ where: { id: eventId }, select: { authorId: true } });
        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found.' });
            return;
        }
        if (userRole !== 'admin' && event.authorId !== userId) {
            res.status(403).json({ success: false, message: 'You can only add files to your own events.' });
            return;
        }
        const parsed = event_types_1.addFileSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const file = await prisma_1.prisma.eventFile.create({
            data: {
                eventId,
                fileName: parsed.data.fileName,
                fileBase64: parsed.data.fileBase64,
                fileType: parsed.data.fileType,
                fileSizeKb: parsed.data.fileSizeKb ?? null,
                uploadedById: userId,
            },
            select: { id: true, fileName: true, fileType: true, fileSizeKb: true, createdAt: true },
        });
        res.status(201).json({ success: true, message: 'File attached.', data: file });
    }
    catch (err) {
        console.error('addEventFile error:', err);
        res.status(500).json({ success: false, message: 'Failed to attach file.' });
    }
}
// ─── GET /api/events/:id/files/:fileId — Download file (base64) ─────────────
async function downloadEventFile(req, res) {
    try {
        const eventId = String(req.params.id);
        const fileId = String(req.params.fileId);
        const file = await prisma_1.prisma.eventFile.findFirst({
            where: { id: fileId, eventId },
            select: { fileName: true, fileBase64: true, fileType: true },
        });
        if (!file) {
            res.status(404).json({ success: false, message: 'File not found.' });
            return;
        }
        res.json({ success: true, data: { fileName: file.fileName, fileBase64: file.fileBase64, fileType: file.fileType } });
    }
    catch (err) {
        console.error('downloadEventFile error:', err);
        res.status(500).json({ success: false, message: 'Failed to download file.' });
    }
}
// ─── DELETE /api/events/:id/files/:fileId — Delete file ─────────────────────
async function deleteEventFile(req, res) {
    try {
        const eventId = String(req.params.id);
        const fileId = String(req.params.fileId);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const event = await prisma_1.prisma.event.findUnique({ where: { id: eventId }, select: { authorId: true } });
        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found.' });
            return;
        }
        if (userRole !== 'admin' && event.authorId !== userId) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }
        await prisma_1.prisma.eventFile.deleteMany({ where: { id: fileId, eventId } });
        res.json({ success: true, message: 'File deleted.' });
    }
    catch (err) {
        console.error('deleteEventFile error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete file.' });
    }
}
//# sourceMappingURL=eventController.js.map