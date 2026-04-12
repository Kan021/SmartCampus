import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getBlocks, createBlock,
  getRooms, createRoom,
  getMyRoom, allocateRoom, vacateRoom, getAllAllocations,
  getGatePasses, applyGatePass, updateGatePass,
  getMessMenu, updateMessMenu,
  getComplaints, fileComplaint, updateComplaint,
  getFees, createFee, markFeePaid,
  getHostelStats, searchStudents, toggleWarden,
} from '../controllers/hostelController';

export function hostelRoutes(app: any) {
  const router = Router();
  router.use(authenticate);

  // Blocks
  router.get('/blocks', getBlocks);
  router.post('/blocks', createBlock);

  // Rooms
  router.get('/rooms', getRooms);
  router.post('/rooms', createRoom);

  // Allocations
  router.get('/my-room', getMyRoom);
  router.get('/all-allocations', getAllAllocations);
  router.post('/allocate', allocateRoom);
  router.patch('/allocate/:id/vacate', vacateRoom);

  // Gate Passes
  router.get('/gate-passes', getGatePasses);
  router.post('/gate-passes', applyGatePass);
  router.patch('/gate-passes/:id', updateGatePass);

  // Mess Menu
  router.get('/mess-menu', getMessMenu);
  router.put('/mess-menu', updateMessMenu);

  // Complaints
  router.get('/complaints', getComplaints);
  router.post('/complaints', fileComplaint);
  router.patch('/complaints/:id', updateComplaint);

  // Fees
  router.get('/fees', getFees);
  router.post('/fees', createFee);
  router.patch('/fees/:id/pay', markFeePaid);

  // Stats & Utilities
  router.get('/stats', getHostelStats);
  router.get('/students', searchStudents);
  router.patch('/staff/:userId', toggleWarden);

  app.use('/api/hostel', router);
}
