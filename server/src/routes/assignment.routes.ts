import { Router } from 'express';
import { getAssignments, createAssignment, submitSolution, getSubmission, gradeSubmission } from '../controllers/assignmentController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.get('/classroom/:classroomId', authenticate, getAssignments);
router.post('/classroom/:classroomId', authenticate, createAssignment);
router.post('/:assignmentId/submit', authenticate, submitSolution);
router.get('/submission/:submissionId', authenticate, getSubmission);
router.put('/submission/:submissionId/grade', authenticate, gradeSubmission);
export default router;
