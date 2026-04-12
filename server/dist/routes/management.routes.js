"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const managementController_1 = require("../controllers/managementController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, managementController_1.getManagement);
router.post('/', auth_middleware_1.authenticate, managementController_1.createManagement);
router.put('/:id', auth_middleware_1.authenticate, managementController_1.updateManagement);
router.delete('/:id', auth_middleware_1.authenticate, managementController_1.deleteManagement);
exports.default = router;
//# sourceMappingURL=management.routes.js.map