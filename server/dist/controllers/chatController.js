"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedUsers = exports.unblockUser = exports.blockUser = exports.sendMessage = exports.getMessages = exports.startConversation = exports.getConversations = exports.searchUsers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ─── User Search (for starting chats) ────────────────────────────
const searchUsers = async (req, res) => {
    try {
        const { name, year, section } = req.query;
        const userId = req.user?.userId;
        // Get blocked users list
        const blocks = await prisma.blockedUser.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
        const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
        const users = await prisma.user.findMany({
            where: {
                id: { notIn: [userId, ...blockedIds] },
                fullName: name ? { contains: name } : undefined,
                profile: {
                    year: year ? parseInt(year) : undefined,
                    section: section ? { equals: section } : undefined,
                },
            },
            select: { id: true, fullName: true, role: true, profile: { select: { year: true, section: true, course: true, avatarBase64: true } } },
            take: 30,
        });
        res.json({ success: true, data: users });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.searchUsers = searchUsers;
// ─── Get conversations ───────────────────────────────────────────
const getConversations = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const convos = await prisma.chatConversation.findMany({
            where: { participants: { some: { userId } } },
            include: {
                participants: { include: { user: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true, year: true, section: true } } } } } },
                messages: { orderBy: { sentAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: convos });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getConversations = getConversations;
// ─── Start / find conversation ───────────────────────────────────
const startConversation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { targetUserId } = req.body;
        if (!targetUserId)
            return res.status(400).json({ success: false, message: 'targetUserId required' });
        // Check if blocked
        const block = await prisma.blockedUser.findFirst({ where: { OR: [{ blockerId: userId, blockedId: targetUserId }, { blockerId: targetUserId, blockedId: userId }] } });
        if (block)
            return res.status(403).json({ success: false, message: 'Cannot message this user' });
        // Find existing convo between these two
        const existing = await prisma.chatConversation.findFirst({
            where: { AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: targetUserId } } }] },
            include: { participants: { include: { user: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true } } } } } } },
        });
        if (existing)
            return res.json({ success: true, data: existing });
        // Create new
        const convo = await prisma.chatConversation.create({
            data: { participants: { create: [{ userId }, { userId: targetUserId }] } },
            include: { participants: { include: { user: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true } } } } } } },
        });
        res.json({ success: true, data: convo });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.startConversation = startConversation;
// ─── Get messages ────────────────────────────────────────────────
const getMessages = async (req, res) => {
    try {
        const convoId = req.params.id;
        const userId = req.user?.userId;
        // Verify participant
        const p = await prisma.chatParticipant.findFirst({ where: { conversationId: convoId, userId } });
        if (!p)
            return res.status(403).json({ success: false, message: 'Not a participant' });
        // Mark unread as read
        await prisma.chatMessage.updateMany({ where: { conversationId: convoId, senderId: { not: userId }, isRead: false }, data: { isRead: true } });
        const messages = await prisma.chatMessage.findMany({
            where: { conversationId: convoId },
            include: { sender: { select: { id: true, fullName: true } } },
            orderBy: { sentAt: 'asc' },
            take: 200,
        });
        res.json({ success: true, data: messages });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getMessages = getMessages;
// ─── Send message ────────────────────────────────────────────────
const sendMessage = async (req, res) => {
    try {
        const convoId = req.params.id;
        const userId = req.user?.userId;
        const { content } = req.body;
        if (!content?.trim())
            return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        // Verify participant
        const p = await prisma.chatParticipant.findFirst({ where: { conversationId: convoId, userId } });
        if (!p)
            return res.status(403).json({ success: false, message: 'Not a participant' });
        // Check not blocked by the other party
        const otherPart = await prisma.chatParticipant.findFirst({ where: { conversationId: convoId, userId: { not: userId } } });
        if (otherPart) {
            const block = await prisma.blockedUser.findFirst({ where: { OR: [{ blockerId: userId, blockedId: otherPart.userId }, { blockerId: otherPart.userId, blockedId: userId }] } });
            if (block)
                return res.status(403).json({ success: false, message: 'Cannot message this user' });
        }
        const msg = await prisma.chatMessage.create({
            data: { conversationId: convoId, senderId: userId, content: content.trim() },
            include: { sender: { select: { id: true, fullName: true } } },
        });
        res.json({ success: true, data: msg });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.sendMessage = sendMessage;
// ─── Block user ──────────────────────────────────────────────────
const blockUser = async (req, res) => {
    try {
        const blockerId = req.user?.userId;
        const blockedId = req.params.userId;
        if (blockerId === blockedId)
            return res.status(400).json({ success: false, message: 'Cannot block yourself' });
        await prisma.blockedUser.upsert({
            where: { blockerId_blockedId: { blockerId, blockedId } },
            create: { blockerId, blockedId },
            update: {},
        });
        res.json({ success: true, message: 'User blocked' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.blockUser = blockUser;
// ─── Unblock user ────────────────────────────────────────────────
const unblockUser = async (req, res) => {
    try {
        const blockerId = req.user?.userId;
        const blockedId = req.params.userId;
        await prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
        res.json({ success: true, message: 'User unblocked' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.unblockUser = unblockUser;
// ─── Get blocked list ────────────────────────────────────────────
const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const blocks = await prisma.blockedUser.findMany({
            where: { blockerId: userId },
            include: { blocked: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true } } } } },
        });
        res.json({ success: true, data: blocks });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getBlockedUsers = getBlockedUsers;
//# sourceMappingURL=chatController.js.map