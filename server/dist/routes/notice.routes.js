"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const noticeController_1 = require("../controllers/noticeController");
const router = (0, express_1.Router)();
// ─── Public-ish routes (still need auth) ─────────────────────────────────
router.use(auth_middleware_1.authenticate);
router.get('/', noticeController_1.getNotices);
router.get('/bulletin', noticeController_1.getBulletin);
router.get('/:id', noticeController_1.getNoticeById);
router.get('/:id/pdf', noticeController_1.downloadNoticePdf);
// ─── Faculty/Admin routes ────────────────────────────────────────────────
router.post('/', noticeController_1.createNotice);
router.delete('/:id', noticeController_1.deleteNotice);
exports.default = router;
//# sourceMappingURL=notice.routes.js.map