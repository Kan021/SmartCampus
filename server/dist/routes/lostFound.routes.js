"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const lostFoundController_1 = require("../controllers/lostFoundController");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', lostFoundController_1.listItems);
router.post('/', lostFoundController_1.createItem);
router.get('/:id', lostFoundController_1.getItem);
router.put('/:id', lostFoundController_1.updateItem);
router.delete('/:id', lostFoundController_1.deleteItem);
router.patch('/:id/claim', lostFoundController_1.claimItem);
router.post('/:id/images', lostFoundController_1.addImage);
router.delete('/:id/images/:imageId', lostFoundController_1.deleteImage);
exports.default = router;
//# sourceMappingURL=lostFound.routes.js.map