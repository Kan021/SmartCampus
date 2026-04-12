"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommunity = exports.updateCommunity = exports.createCommunity = exports.getCommunities = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// GET all communities
const getCommunities = async (_req, res) => {
    try {
        const communities = await prisma.community.findMany({ orderBy: { createdAt: 'asc' } });
        res.json({ success: true, data: communities });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getCommunities = getCommunities;
// POST create community (admin only)
const createCommunity = async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'admin' && role !== 'faculty')
            return res.status(403).json({ success: false, message: 'Not authorized' });
        const { name, description, type, logoBase64, isRecruitmentActive, formUrl, memberCount, foundedYear, tags } = req.body;
        const c = await prisma.community.create({ data: { name, description, type: type || 'technical', logoBase64, isRecruitmentActive: isRecruitmentActive || false, formUrl, memberCount: memberCount || 0, foundedYear, tags: tags || '' } });
        res.json({ success: true, data: c });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createCommunity = createCommunity;
// PUT update community
const updateCommunity = async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'admin' && role !== 'faculty')
            return res.status(403).json({ success: false, message: 'Not authorized' });
        const id = req.params.id;
        const c = await prisma.community.update({ where: { id }, data: req.body });
        res.json({ success: true, data: c });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateCommunity = updateCommunity;
// DELETE community
const deleteCommunity = async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });
        await prisma.community.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deleteCommunity = deleteCommunity;
//# sourceMappingURL=communityController.js.map