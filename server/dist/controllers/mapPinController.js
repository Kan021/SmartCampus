"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePin = exports.createPin = exports.listPins = void 0;
const prisma_1 = require("../utils/prisma");
// GET /api/map-pins — list all pins
const listPins = async (_req, res) => {
    try {
        const pins = await prisma_1.prisma.mapPin.findMany({
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, fullName: true, role: true } } },
        });
        res.json({ success: true, data: pins });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.listPins = listPins;
// POST /api/map-pins — create pin (faculty/admin only)
const createPin = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        if (role === 'student')
            return res.status(403).json({ success: false, message: 'Only faculty or admin can create map pins.' });
        const { name, description, category, latitude, longitude, icon, color } = req.body;
        if (!name || latitude == null || longitude == null) {
            return res.status(400).json({ success: false, message: 'Name, latitude, and longitude are required.' });
        }
        const pin = await prisma_1.prisma.mapPin.create({
            data: {
                name, description: description || '', category: category || 'custom',
                latitude, longitude, icon: icon || '📍', color: color || '#C62828',
                createdById: userId,
            },
            include: { createdBy: { select: { id: true, fullName: true, role: true } } },
        });
        res.status(201).json({ success: true, data: pin });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createPin = createPin;
// DELETE /api/map-pins/:id — delete pin (owner or admin)
const deletePin = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const pinId = req.params.id;
        const pin = await prisma_1.prisma.mapPin.findUnique({ where: { id: pinId } });
        if (!pin)
            return res.status(404).json({ success: false, message: 'Pin not found.' });
        if (role !== 'admin' && pin.createdById !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorised.' });
        }
        await prisma_1.prisma.mapPin.delete({ where: { id: pinId } });
        res.json({ success: true, message: 'Pin deleted.' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deletePin = deletePin;
//# sourceMappingURL=mapPinController.js.map