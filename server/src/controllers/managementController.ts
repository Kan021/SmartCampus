import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Allowed fields for management create/update (whitelist to prevent mass-assignment)
const MANAGEMENT_FIELDS = [
  'name', 'designation', 'department', 'school',
  'office', 'phone', 'email', 'photoBase64', 'order',
] as const;

function pickManagementFields(body: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    MANAGEMENT_FIELDS.filter(k => k in body).map(k => [k, body[k]])
  );
}

// GET all management entries
export const getManagement = async (_req: Request, res: Response): Promise<void> => {
  try {
    const entries = await prisma.management.findMany({ orderBy: { order: 'asc' } });
    res.json({ success: true, data: entries });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST create entry (admin only)
export const createManagement = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }

    const { name, designation, department, school, office, phone, email, photoBase64, order } = req.body;
    if (!name || !designation) {
      res.status(400).json({ success: false, message: 'name and designation are required' });
      return;
    }

    const entry = await prisma.management.create({
      data: { name, designation, department, school, office, phone, email, photoBase64, order: order ?? 0 },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PUT update entry (admin only) — whitelisted fields only
export const updateManagement = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }

    const data = pickManagementFields(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update' });
      return;
    }

    const entry = await prisma.management.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json({ success: true, data: entry });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE entry (admin only)
export const deleteManagement = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }

    await prisma.management.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
