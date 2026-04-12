"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const classroomController_1 = require("../controllers/classroomController");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/my', classroomController_1.getMyClassroom);
router.post('/create', (0, auth_middleware_1.authorize)('admin'), classroomController_1.createClassroom);
router.get('/:id/members', classroomController_1.getMembers);
router.get('/:id/notes', classroomController_1.getNotes);
router.post('/:id/notes', classroomController_1.uploadNote);
router.get('/:id/notes/:noteId/download', classroomController_1.downloadNote);
router.delete('/:id/notes/:noteId', classroomController_1.deleteNote);
router.get('/:id/messages', classroomController_1.getMessages);
router.post('/:id/messages', classroomController_1.postMessage);
router.post('/:id/join-faculty', (0, auth_middleware_1.authorize)('admin'), classroomController_1.joinFaculty);
exports.default = router;
//# sourceMappingURL=classroom.routes.js.map