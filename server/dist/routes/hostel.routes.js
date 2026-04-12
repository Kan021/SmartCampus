"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hostelRoutes = hostelRoutes;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const hostelController_1 = require("../controllers/hostelController");
function hostelRoutes(app) {
    const router = (0, express_1.Router)();
    router.use(auth_middleware_1.authenticate);
    // Blocks
    router.get('/blocks', hostelController_1.getBlocks);
    router.post('/blocks', hostelController_1.createBlock);
    // Rooms
    router.get('/rooms', hostelController_1.getRooms);
    router.post('/rooms', hostelController_1.createRoom);
    // Allocations
    router.get('/my-room', hostelController_1.getMyRoom);
    router.get('/all-allocations', hostelController_1.getAllAllocations);
    router.post('/allocate', hostelController_1.allocateRoom);
    router.patch('/allocate/:id/vacate', hostelController_1.vacateRoom);
    // Gate Passes
    router.get('/gate-passes', hostelController_1.getGatePasses);
    router.post('/gate-passes', hostelController_1.applyGatePass);
    router.patch('/gate-passes/:id', hostelController_1.updateGatePass);
    // Mess Menu
    router.get('/mess-menu', hostelController_1.getMessMenu);
    router.put('/mess-menu', hostelController_1.updateMessMenu);
    // Complaints
    router.get('/complaints', hostelController_1.getComplaints);
    router.post('/complaints', hostelController_1.fileComplaint);
    router.patch('/complaints/:id', hostelController_1.updateComplaint);
    // Fees
    router.get('/fees', hostelController_1.getFees);
    router.post('/fees', hostelController_1.createFee);
    router.patch('/fees/:id/pay', hostelController_1.markFeePaid);
    // Stats & Utilities
    router.get('/stats', hostelController_1.getHostelStats);
    router.get('/students', hostelController_1.searchStudents);
    router.patch('/staff/:userId', hostelController_1.toggleWarden);
    app.use('/api/hostel', router);
}
//# sourceMappingURL=hostel.routes.js.map