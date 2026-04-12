import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET all management entries
export const getManagement = async (_req: Request, res: Response) => {
  try {
    const entries = await prisma.management.findMany({ orderBy: { order: 'asc' } });
    res.json({ success: true, data: entries });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST create entry (admin only)
export const createManagement = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const { name, designation, department, school, office, phone, email, photoBase64, order } = req.body;
    const entry = await prisma.management.create({ data: { name, designation, department, school, office, phone, email, photoBase64, order: order || 0 } });
    res.json({ success: true, data: entry });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT update entry
export const updateManagement = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const entry = await prisma.management.update({ where: { id: req.params.id as string }, data: req.body });
    res.json({ success: true, data: entry });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE entry
export const deleteManagement = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    await prisma.management.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
