"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const profileController_1 = require("../controllers/profileController");
const router = (0, express_1.Router)();
// ─── All profile routes require authentication ────────────────────────────
router.use(auth_middleware_1.authenticate);
// ─── Current user routes ─────────────────────────────────────────────────
router.get('/me', profileController_1.getMyProfile);
router.put('/me', profileController_1.updateMyProfile);
// ─── Admin-only routes ───────────────────────────────────────────────────
router.get('/users', (0, auth_middleware_1.authorize)('admin'), profileController_1.listUsers);
router.get('/:userId', (0, auth_middleware_1.authorize)('admin'), profileController_1.getUserProfile);
router.patch('/users/:userId/role', (0, auth_middleware_1.authorize)('admin'), profileController_1.updateUserRole);
router.put('/users/:userId', (0, auth_middleware_1.authorize)('admin'), profileController_1.updateUserProfile);
router.post('/bulk-update', (0, auth_middleware_1.authorize)('admin'), profileController_1.bulkUpdateProfiles);
exports.default = router;
//# sourceMappingURL=profile.routes.js.map