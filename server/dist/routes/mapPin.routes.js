"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const mapPinController_1 = require("../controllers/mapPinController");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, mapPinController_1.listPins);
router.post('/', auth_middleware_1.authenticate, mapPinController_1.createPin);
router.delete('/:id', auth_middleware_1.authenticate, mapPinController_1.deletePin);
exports.default = router;
//# sourceMappingURL=mapPin.routes.js.map