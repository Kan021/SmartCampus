"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteManagement = exports.updateManagement = exports.createManagement = exports.getManagement = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// GET all management entries
const getManagement = async (_req, res) => {
    try {
        const entries = await prisma.management.findMany({ orderBy: { order: 'asc' } });
        res.json({ success: true, data: entries });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getManagement = getManagement;
// POST create entry (admin only)
const createManagement = async (req, res) => {
    try {
        if (req.user?.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Admin only' });
        const { name, designation, department, school, office, phone, email, photoBase64, order } = req.body;
        const entry = await prisma.management.create({ data: { name, designation, department, school, office, phone, email, photoBase64, order: order || 0 } });
        res.json({ success: true, data: entry });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createManagement = createManagement;
// PUT update entry
const updateManagement = async (req, res) => {
    try {
        if (req.user?.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Admin only' });
        const entry = await prisma.management.update({ where: { id: req.params.id }, data: req.body });
        res.json({ success: true, data: entry });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateManagement = updateManagement;
// DELETE entry
const deleteManagement = async (req, res) => {
    try {
        if (req.user?.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Admin only' });
        await prisma.management.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deleteManagement = deleteManagement;
//# sourceMappingURL=managementController.js.map