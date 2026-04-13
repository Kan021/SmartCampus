import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Allowed fields for community create/update (whitelist to prevent mass-assignment)
const COMMUNITY_FIELDS = [
  'name', 'description', 'type', 'logoBase64',
  'isRecruitmentActive', 'formUrl', 'memberCount', 'foundedYear', 'tags',
] as const;

type CommunityField = typeof COMMUNITY_FIELDS[number];

function pickCommunityFields(body: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    COMMUNITY_FIELDS.filter(k => k in body).map(k => [k, body[k]])
  );
}

// GET all communities
export const getCommunities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const communities = await prisma.community.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: communities });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST create community (admin/faculty only)
export const createCommunity = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'faculty') {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const { name, description, type, logoBase64, isRecruitmentActive, formUrl, memberCount, foundedYear, tags } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }

    const community = await prisma.community.create({
      data: {
        name,
        description,
        type: type || 'technical',
        logoBase64,
        isRecruitmentActive: isRecruitmentActive || false,
        formUrl,
        memberCount: memberCount || 0,
        foundedYear,
        tags: tags || '',
      },
    });

    res.status(201).json({ success: true, data: community });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PUT update community (admin/faculty) — whitelisted fields only
export const updateCommunity = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'faculty') {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const id = req.params.id as string;
    const data = pickCommunityFields(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update' });
      return;
    }

    const community = await prisma.community.update({ where: { id }, data });
    res.json({ success: true, data: community });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE community (admin only)
export const deleteCommunity = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }

    await prisma.community.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
