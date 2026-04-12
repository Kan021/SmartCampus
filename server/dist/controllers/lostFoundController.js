"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createItem = createItem;
exports.listItems = listItems;
exports.getItem = getItem;
exports.claimItem = claimItem;
exports.updateItem = updateItem;
exports.deleteItem = deleteItem;
exports.addImage = addImage;
exports.deleteImage = deleteImage;
const prisma_1 = require("../utils/prisma");
const ITEM_SELECT = {
    id: true, title: true, description: true, location: true,
    foundDate: true, category: true, status: true,
    contactName: true, contactPhone: true, contactEmail: true,
    reportedById: true, createdAt: true, updatedAt: true,
    reportedBy: { select: { id: true, fullName: true, role: true } },
    images: { select: { id: true, caption: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
};
// POST /api/lost-found — Report a found item
async function createItem(req, res) {
    try {
        const userId = req.user.userId;
        const { title, description, location, foundDate, category, contactName, contactPhone, contactEmail, images } = req.body;
        if (!title?.trim() || !description?.trim() || !location?.trim() || !foundDate || !contactName?.trim()) {
            res.status(400).json({ success: false, message: 'title, description, location, foundDate and contactName are required.' });
            return;
        }
        const item = await prisma_1.prisma.lostFoundItem.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                foundDate: new Date(foundDate),
                category: category || 'other',
                contactName: contactName.trim(),
                contactPhone: contactPhone?.trim() || null,
                contactEmail: contactEmail?.trim() || null,
                reportedById: userId,
            },
            select: ITEM_SELECT,
        });
        // Attach images if provided
        if (Array.isArray(images) && images.length > 0) {
            for (const img of images.slice(0, 5)) { // max 5 images
                if (img.imageBase64) {
                    await prisma_1.prisma.lostFoundImage.create({
                        data: { itemId: item.id, imageBase64: img.imageBase64, caption: img.caption || null },
                    });
                }
            }
        }
        // Re-fetch with images included
        const full = await prisma_1.prisma.lostFoundItem.findUnique({ where: { id: item.id }, select: ITEM_SELECT });
        res.status(201).json({ success: true, message: 'Item reported successfully.', data: full });
    }
    catch (err) {
        console.error('createItem error:', err);
        res.status(500).json({ success: false, message: 'Failed to report item.' });
    }
}
// GET /api/lost-found — List items (latest first, paginated)
async function listItems(req, res) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
        const skip = (page - 1) * limit;
        const category = req.query.category;
        const status = req.query.status;
        const search = req.query.search;
        const where = {};
        if (category && category !== 'all')
            where.category = category;
        if (status && status !== 'all')
            where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { location: { contains: search } },
                { contactName: { contains: search } },
            ];
        }
        const [items, total] = await Promise.all([
            prisma_1.prisma.lostFoundItem.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, select: ITEM_SELECT }),
            prisma_1.prisma.lostFoundItem.count({ where }),
        ]);
        res.json({ success: true, data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
    }
    catch (err) {
        console.error('listItems error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch items.' });
    }
}
// GET /api/lost-found/:id — Get single item with full images
async function getItem(req, res) {
    try {
        const id = String(req.params.id);
        const item = await prisma_1.prisma.lostFoundItem.findUnique({
            where: { id },
            include: {
                reportedBy: { select: { id: true, fullName: true, role: true } },
                images: { orderBy: { createdAt: 'asc' } }, // full base64 here
            },
        });
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found.' });
            return;
        }
        res.json({ success: true, data: item });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch item.' });
    }
}
// PATCH /api/lost-found/:id/claim — Mark as claimed
async function claimItem(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const item = await prisma_1.prisma.lostFoundItem.findUnique({ where: { id }, select: { reportedById: true } });
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found.' });
            return;
        }
        if (userRole !== 'admin' && item.reportedById !== userId) {
            res.status(403).json({ success: false, message: 'Only the reporter or admin can mark as claimed.' });
            return;
        }
        const updated = await prisma_1.prisma.lostFoundItem.update({ where: { id }, data: { status: 'claimed' }, select: ITEM_SELECT });
        res.json({ success: true, message: 'Item marked as claimed.', data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update status.' });
    }
}
// PUT /api/lost-found/:id — Update item (reporter or admin)
async function updateItem(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const existing = await prisma_1.prisma.lostFoundItem.findUnique({ where: { id }, select: { reportedById: true } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Item not found.' });
            return;
        }
        if (userRole !== 'admin' && existing.reportedById !== userId) {
            res.status(403).json({ success: false, message: 'You can only edit your own reports.' });
            return;
        }
        const { title, description, location, foundDate, category, contactName, contactPhone, contactEmail, status } = req.body;
        const data = {};
        if (title)
            data.title = title.trim();
        if (description)
            data.description = description.trim();
        if (location)
            data.location = location.trim();
        if (foundDate)
            data.foundDate = new Date(foundDate);
        if (category)
            data.category = category;
        if (contactName)
            data.contactName = contactName.trim();
        if (contactPhone !== undefined)
            data.contactPhone = contactPhone?.trim() || null;
        if (contactEmail !== undefined)
            data.contactEmail = contactEmail?.trim() || null;
        if (status)
            data.status = status;
        const updated = await prisma_1.prisma.lostFoundItem.update({ where: { id }, data, select: ITEM_SELECT });
        res.json({ success: true, message: 'Item updated.', data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update item.' });
    }
}
// DELETE /api/lost-found/:id — Delete item (reporter or admin)
async function deleteItem(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const existing = await prisma_1.prisma.lostFoundItem.findUnique({ where: { id }, select: { reportedById: true } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Item not found.' });
            return;
        }
        if (userRole !== 'admin' && existing.reportedById !== userId) {
            res.status(403).json({ success: false, message: 'You can only delete your own reports.' });
            return;
        }
        await prisma_1.prisma.lostFoundItem.delete({ where: { id } });
        res.json({ success: true, message: 'Item deleted.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete item.' });
    }
}
// POST /api/lost-found/:id/images — Add image to existing item
async function addImage(req, res) {
    try {
        const id = String(req.params.id);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { imageBase64, caption } = req.body;
        if (!imageBase64) {
            res.status(400).json({ success: false, message: 'imageBase64 required.' });
            return;
        }
        const item = await prisma_1.prisma.lostFoundItem.findUnique({ where: { id }, select: { reportedById: true } });
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found.' });
            return;
        }
        if (userRole !== 'admin' && item.reportedById !== userId) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }
        const img = await prisma_1.prisma.lostFoundImage.create({
            data: { itemId: id, imageBase64, caption: caption?.trim() || null },
            select: { id: true, caption: true, createdAt: true },
        });
        res.status(201).json({ success: true, message: 'Image added.', data: img });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add image.' });
    }
}
// DELETE /api/lost-found/:id/images/:imageId
async function deleteImage(req, res) {
    try {
        const id = String(req.params.id);
        const imageId = String(req.params.imageId);
        const userId = req.user.userId;
        const userRole = req.user.role;
        const item = await prisma_1.prisma.lostFoundItem.findUnique({ where: { id }, select: { reportedById: true } });
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found.' });
            return;
        }
        if (userRole !== 'admin' && item.reportedById !== userId) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }
        await prisma_1.prisma.lostFoundImage.deleteMany({ where: { id: imageId, itemId: id } });
        res.json({ success: true, message: 'Image deleted.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete image.' });
    }
}
//# sourceMappingURL=lostFoundController.js.map