"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/users/search', auth_middleware_1.authenticate, chatController_1.searchUsers);
router.get('/conversations', auth_middleware_1.authenticate, chatController_1.getConversations);
router.post('/conversations', auth_middleware_1.authenticate, chatController_1.startConversation);
router.get('/conversations/:id/messages', auth_middleware_1.authenticate, chatController_1.getMessages);
router.post('/conversations/:id/messages', auth_middleware_1.authenticate, chatController_1.sendMessage);
router.post('/users/:userId/block', auth_middleware_1.authenticate, chatController_1.blockUser);
router.delete('/users/:userId/block', auth_middleware_1.authenticate, chatController_1.unblockUser);
router.get('/blocked', auth_middleware_1.authenticate, chatController_1.getBlockedUsers);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map