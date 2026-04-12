"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communityController_1 = require("../controllers/communityController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, communityController_1.getCommunities);
router.post('/', auth_middleware_1.authenticate, communityController_1.createCommunity);
router.put('/:id', auth_middleware_1.authenticate, communityController_1.updateCommunity);
router.delete('/:id', auth_middleware_1.authenticate, communityController_1.deleteCommunity);
exports.default = router;
//# sourceMappingURL=community.routes.js.map