"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assignmentController_1 = require("../controllers/assignmentController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/classroom/:classroomId', auth_middleware_1.authenticate, assignmentController_1.getAssignments);
router.post('/classroom/:classroomId', auth_middleware_1.authenticate, assignmentController_1.createAssignment);
router.post('/:assignmentId/submit', auth_middleware_1.authenticate, assignmentController_1.submitSolution);
router.get('/submission/:submissionId', auth_middleware_1.authenticate, assignmentController_1.getSubmission);
router.put('/submission/:submissionId/grade', auth_middleware_1.authenticate, assignmentController_1.gradeSubmission);
exports.default = router;
//# sourceMappingURL=assignment.routes.js.map