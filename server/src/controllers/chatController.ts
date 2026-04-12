import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── User Search (for starting chats) ────────────────────────────
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { name, year, section } = req.query;
    const userId = req.user?.userId as string;
    // Get blocked users list
    const blocks = await prisma.blockedUser.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: [userId, ...blockedIds] },
        fullName: name ? { contains: name as string } : undefined,
        profile: {
          year: year ? parseInt(year as string) : undefined,
          section: section ? { equals: section as string } : undefined,
        },
      },
      select: { id: true, fullName: true, role: true, profile: { select: { year: true, section: true, course: true, avatarBase64: true } } },
      take: 30,
    });
    res.json({ success: true, data: users });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Get conversations ───────────────────────────────────────────
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId as string;
    const convos = await prisma.chatConversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true, year: true, section: true } } } } } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: convos });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Start / find conversation ───────────────────────────────────
export const startConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId as string;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId required' });
    // Check if blocked
    const block = await prisma.blockedUser.findFirst({ where: { OR: [{ blockerId: userId, blockedId: targetUserId }, { blockerId: targetUserId, blockedId: userId }] } });
    if (block) return res.status(403).json({ success: false, message: 'Cannot message this user' });
    // Find existing convo between these two
    const existing = await prisma.chatConversation.findFirst({
      where: { AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: targetUserId } } }] },
      include: { participants: { include: { user: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true } } } } } } },
    });
    if (existing) return res.json({ success: true, data: existing });
    // Create new
    const convo = await prisma.chatConversation.create({
      data: { participants: { create: [{ userId }, { userId: targetUserId }] } },
      include: { participants: { include: { user: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true } } } } } } },
    });
    res.json({ success: true, data: convo });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Get messages ────────────────────────────────────────────────
export const getMessages = async (req: Request, res: Response) => {
  try {
    const convoId = req.params.id as string;
    const userId = req.user?.userId as string;
    // Verify participant
    const p = await prisma.chatParticipant.findFirst({ where: { conversationId: convoId, userId } });
    if (!p) return res.status(403).json({ success: false, message: 'Not a participant' });
    // Mark unread as read
    await prisma.chatMessage.updateMany({ where: { conversationId: convoId, senderId: { not: userId }, isRead: false }, data: { isRead: true } });
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: convoId },
      include: { sender: { select: { id: true, fullName: true } } },
      orderBy: { sentAt: 'asc' },
      take: 200,
    });
    res.json({ success: true, data: messages });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Send message ────────────────────────────────────────────────
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const convoId = req.params.id as string;
    const userId = req.user?.userId as string;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    // Verify participant
    const p = await prisma.chatParticipant.findFirst({ where: { conversationId: convoId, userId } });
    if (!p) return res.status(403).json({ success: false, message: 'Not a participant' });
    // Check not blocked by the other party
    const otherPart = await prisma.chatParticipant.findFirst({ where: { conversationId: convoId, userId: { not: userId } } });
    if (otherPart) {
      const block = await prisma.blockedUser.findFirst({ where: { OR: [{ blockerId: userId, blockedId: otherPart.userId }, { blockerId: otherPart.userId, blockedId: userId }] } });
      if (block) return res.status(403).json({ success: false, message: 'Cannot message this user' });
    }
    const msg = await prisma.chatMessage.create({
      data: { conversationId: convoId, senderId: userId, content: content.trim() },
      include: { sender: { select: { id: true, fullName: true } } },
    });
    res.json({ success: true, data: msg });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Block user ──────────────────────────────────────────────────
export const blockUser = async (req: Request, res: Response) => {
  try {
    const blockerId = req.user?.userId as string;
    const blockedId = req.params.userId as string;
    if (blockerId === blockedId) return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    res.json({ success: true, message: 'User blocked' });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Unblock user ────────────────────────────────────────────────
export const unblockUser = async (req: Request, res: Response) => {
  try {
    const blockerId = req.user?.userId as string;
    const blockedId = req.params.userId as string;
    await prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
    res.json({ success: true, message: 'User unblocked' });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ─── Get blocked list ────────────────────────────────────────────
export const getBlockedUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId as string;
    const blocks = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, fullName: true, profile: { select: { avatarBase64: true } } } } },
    });
    res.json({ success: true, data: blocks });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
