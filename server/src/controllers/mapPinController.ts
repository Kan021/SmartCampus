import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// GET /api/map-pins — list all pins
export const listPins = async (_req: Request, res: Response) => {
  try {
    const pins = await prisma.mapPin.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, fullName: true, role: true } } },
    });
    res.json({ success: true, data: pins });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/map-pins — create pin (faculty/admin only)
export const createPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role   = req.user!.role;
    if (role === 'student') return res.status(403).json({ success: false, message: 'Only faculty or admin can create map pins.' });

    const { name, description, category, latitude, longitude, icon, color } = req.body;
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'Name, latitude, and longitude are required.' });
    }

    const pin = await prisma.mapPin.create({
      data: {
        name, description: description || '', category: category || 'custom',
        latitude, longitude, icon: icon || '📍', color: color || '#C62828',
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, fullName: true, role: true } } },
    });
    res.status(201).json({ success: true, data: pin });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /api/map-pins/:id — delete pin (owner or admin)
export const deletePin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const role   = req.user!.role as string;
    const pinId  = req.params.id as string;

    const pin = await prisma.mapPin.findUnique({ where: { id: pinId } });
    if (!pin) return res.status(404).json({ success: false, message: 'Pin not found.' });

    if (role !== 'admin' && pin.createdById !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    await prisma.mapPin.delete({ where: { id: pinId } });
    res.json({ success: true, message: 'Pin deleted.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
