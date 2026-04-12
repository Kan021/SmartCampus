import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET all communities
export const getCommunities = async (_req: Request, res: Response) => {
  try {
    const communities = await prisma.community.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: communities });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST create community (admin only)
export const createCommunity = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'faculty') return res.status(403).json({ success: false, message: 'Not authorized' });
    const { name, description, type, logoBase64, isRecruitmentActive, formUrl, memberCount, foundedYear, tags } = req.body;
    const c = await prisma.community.create({ data: { name, description, type: type || 'technical', logoBase64, isRecruitmentActive: isRecruitmentActive || false, formUrl, memberCount: memberCount || 0, foundedYear, tags: tags || '' } });
    res.json({ success: true, data: c });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT update community
export const updateCommunity = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'faculty') return res.status(403).json({ success: false, message: 'Not authorized' });
    const id = req.params.id as string;
    const c = await prisma.community.update({ where: { id }, data: req.body });
    res.json({ success: true, data: c });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE community
export const deleteCommunity = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });
    await prisma.community.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
