"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const eventController_1 = require("../controllers/eventController");
const router = (0, express_1.Router)();
// All event routes require authentication
router.use(auth_middleware_1.authenticate);
// ─── Event CRUD ──────────────────────────────────────────────────
router.get('/', eventController_1.getEvents);
router.get('/:id', eventController_1.getEventById);
router.post('/', eventController_1.createEvent); // any authenticated user
router.put('/:id', eventController_1.updateEvent); // author or admin
router.delete('/:id', eventController_1.deleteEvent); // author or admin
// ─── Event File Attachments ──────────────────────────────────────
router.post('/:id/files', eventController_1.addEventFile);
router.get('/:id/files/:fileId', eventController_1.downloadEventFile);
router.delete('/:id/files/:fileId', eventController_1.deleteEventFile);
exports.default = router;
//# sourceMappingURL=event.routes.js.map