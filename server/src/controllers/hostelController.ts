import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// ─── Helper: check warden/admin access ──────────────────────────
async function isHostelStaff(userId: string, role: string): Promise<boolean> {
  if (role === 'admin') return true;
  if (role !== 'faculty') return false;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { isWarden: true } });
  return !!profile?.isWarden;
}

// ─── GET /blocks — All hostel blocks ────────────────────────────
export async function getBlocks(req: Request, res: Response): Promise<void> {
  try {
    const blocks = await prisma.hostelBlock.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { rooms: true, complaints: true } },
        rooms: { select: { id: true, isAvailable: true, capacity: true, allocations: { where: { status: 'active' }, select: { id: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: blocks });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to fetch blocks.' }); }
}

// ─── POST /blocks — Create block (admin) ────────────────────────
export async function createBlock(req: Request, res: Response): Promise<void> {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ success: false, message: 'Admin only.' }); return; }
    const { name, type, totalFloors, address, wardenName, wardenPhone } = req.body;
    if (!name || !type) { res.status(400).json({ success: false, message: 'name and type required.' }); return; }
    const block = await prisma.hostelBlock.create({ data: { name, type, totalFloors: totalFloors ?? 4, address, wardenName, wardenPhone } });
    res.status(201).json({ success: true, data: block });
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ success: false, message: 'Block name already exists.' }); return; }
    res.status(500).json({ success: false, message: 'Failed to create block.' });
  }
}

// ─── GET /rooms — All rooms with occupancy ──────────────────────
export async function getRooms(req: Request, res: Response): Promise<void> {
  try {
    const { blockId, available } = req.query as Record<string, string>;
    const where: any = {};
    if (blockId) where.blockId = blockId;
    if (available === 'true') where.isAvailable = true;
    const rooms = await prisma.hostelRoom.findMany({
      where,
      include: {
        block: { select: { name: true, type: true } },
        allocations: {
          where: { status: 'active' },
          include: { student: { select: { fullName: true, email: true, profile: { select: { rollNumber: true, course: true, year: true, phone: true } } } } },
        },
        _count: { select: { allocations: true } },
      },
      orderBy: [{ blockId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    });
    res.json({ success: true, data: rooms });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch rooms.' }); }
}

// ─── POST /rooms — Create room (admin/warden) ───────────────────
export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { blockId, roomNumber, floor, capacity, type, amenities } = req.body;
    if (!blockId || !roomNumber) { res.status(400).json({ success: false, message: 'blockId and roomNumber required.' }); return; }
    const room = await prisma.hostelRoom.create({
      data: { blockId, roomNumber, floor: floor ?? 1, capacity: capacity ?? 2, type: type ?? 'double', amenities: amenities ?? '' },
    });
    res.status(201).json({ success: true, data: room });
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ success: false, message: 'Room number already exists in this block.' }); return; }
    res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
}

// ─── GET /my-room — Student's current room ──────────────────────
export async function getMyRoom(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.user!;
    const allocation = await prisma.roomAllocation.findFirst({
      where: { studentId: userId, status: 'active' },
      include: {
        room: {
          include: {
            block: true,
            allocations: {
              where: { status: 'active' },
              include: { student: { select: { id: true, fullName: true, email: true, profile: { select: { bloodGroup: true, phone: true, course: true, year: true, section: true } } } } },
            },
          },
        },
      },
    });

    // Also get their fee summary
    const fees = await prisma.hostelFee.findMany({
      where: { studentId: userId },
      orderBy: { dueDate: 'desc' },
    });

    res.json({ success: true, data: { allocation, fees } });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch room info.' }); }
}

// ─── POST /allocate — Allocate room to student ──────────────────
export async function allocateRoom(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { studentId, roomId, academicYear, remarks } = req.body;
    if (!studentId || !roomId || !academicYear) { res.status(400).json({ success: false, message: 'studentId, roomId, academicYear required.' }); return; }

    // Check room capacity
    const room = await prisma.hostelRoom.findUnique({
      where: { id: roomId },
      include: { allocations: { where: { status: 'active' } } },
    });
    if (!room) { res.status(404).json({ success: false, message: 'Room not found.' }); return; }
    if (room.allocations.length >= room.capacity) { res.status(409).json({ success: false, message: `Room is full (${room.capacity}/${room.capacity}).` }); return; }

    // Vacate existing allocation
    await prisma.roomAllocation.updateMany({ where: { studentId, status: 'active' }, data: { status: 'vacated', checkOutDate: new Date() } });

    const allocation = await prisma.roomAllocation.create({
      data: { studentId, roomId, academicYear, remarks, status: 'active' },
      include: { student: { select: { fullName: true, email: true } }, room: { include: { block: true } } },
    });

    // Update room availability
    const newCount = room.allocations.length + 1;
    await prisma.hostelRoom.update({ where: { id: roomId }, data: { isAvailable: newCount < room.capacity } });

    res.status(201).json({ success: true, message: `Room allocated to ${allocation.student.fullName}.`, data: allocation });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to allocate room.' }); }
}

// ─── PATCH /allocate/:id/vacate — Vacate a room ─────────────────
export async function vacateRoom(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const allocation = await prisma.roomAllocation.update({
      where: { id: String(req.params.id) },
      data: { status: 'vacated', checkOutDate: new Date() },
      include: { room: true },
    });
    await prisma.hostelRoom.update({ where: { id: allocation.roomId }, data: { isAvailable: true } });
    res.json({ success: true, message: 'Room vacated.', data: allocation });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to vacate room.' }); }
}

// ─── GET /gate-passes — Gate passes (student: own; staff: all) ──
export async function getGatePasses(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const isStaff = await isHostelStaff(userId, role);
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (!isStaff) where.studentId = userId;
    if (status && status !== 'all') where.status = status;

    const passes = await prisma.gatePass.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { fullName: true, email: true, profile: { select: { rollNumber: true, phone: true } } } },
        approvedBy: { select: { fullName: true } },
      },
    });
    res.json({ success: true, data: passes });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch gate passes.' }); }
}

// ─── POST /gate-passes — Apply for gate pass (student) ──────────
export async function applyGatePass(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.user!;
    const { purpose, destination, outDateTime, expectedReturn, studentRemarks } = req.body;
    if (!purpose || !destination || !outDateTime || !expectedReturn) {
      res.status(400).json({ success: false, message: 'purpose, destination, outDateTime, expectedReturn required.' }); return;
    }
    const pass = await prisma.gatePass.create({
      data: { studentId: userId, purpose, destination, outDateTime: new Date(outDateTime), expectedReturn: new Date(expectedReturn), studentRemarks },
    });
    res.status(201).json({ success: true, message: 'Gate pass application submitted.', data: pass });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to apply for gate pass.' }); }
}

// ─── PATCH /gate-passes/:id — Approve/Reject/Return (warden) ────
export async function updateGatePass(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const isStaff = await isHostelStaff(userId, role);
    const { status, remarks } = req.body;
    const id = String(req.params.id);

    // Students can only mark their own as returned
    if (!isStaff) {
      if (status !== 'returned') { res.status(403).json({ success: false, message: 'You can only mark your pass as returned.' }); return; }
      const updated = await prisma.gatePass.update({
        where: { id, studentId: userId },
        data: { status: 'returned', actualReturn: new Date() },
      });
      res.json({ success: true, data: updated });
      return;
    }

    const data: any = { status, remarks };
    if (status === 'approved' || status === 'rejected') { data.approvedById = userId; data.approvedAt = new Date(); }
    if (status === 'returned') { data.actualReturn = new Date(); }

    const updated = await prisma.gatePass.update({ where: { id }, data });
    res.json({ success: true, message: `Gate pass ${status}.`, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update gate pass.' }); }
}

// ─── GET /mess-menu — Weekly mess schedule ──────────────────────
export async function getMessMenu(req: Request, res: Response): Promise<void> {
  try {
    const menus = await prisma.messMenu.findMany({ orderBy: [{ day: 'asc' }, { meal: 'asc' }] });
    res.json({ success: true, data: menus });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch mess menu.' }); }
}

// ─── PUT /mess-menu — Upsert mess menu entry (warden/admin) ─────
export async function updateMessMenu(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { day, meal, items, blockId } = req.body;
    if (!day || !meal || !items) { res.status(400).json({ success: false, message: 'day, meal, items required.' }); return; }
    const menu = await prisma.messMenu.upsert({
      where: { blockId_day_meal: { blockId: blockId ?? 'COMMON', day, meal } },
      update: { items, updatedById: req.user!.userId },
      create: { blockId: blockId ?? 'COMMON', day, meal, items, updatedById: req.user!.userId },
    });
    res.json({ success: true, data: menu });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to update mess menu.' }); }
}

// ─── GET /complaints — Complaints ───────────────────────────────
export async function getComplaints(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const isStaff = await isHostelStaff(userId, role);
    const { status, type } = req.query as Record<string, string>;
    const where: any = {};
    if (!isStaff) where.studentId = userId;
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;

    const complaints = await prisma.hostelComplaint.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        student: { select: { fullName: true, email: true, profile: { select: { rollNumber: true, phone: true } } } },
        block: { select: { name: true } },
        room: { select: { roomNumber: true } },
        resolvedBy: { select: { fullName: true } },
      },
    });
    res.json({ success: true, data: complaints });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch complaints.' }); }
}

// ─── POST /complaints — File complaint (student) ─────────────────
export async function fileComplaint(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.user!;
    const { type, title, description, priority, blockId, roomId } = req.body;
    if (!type || !title || !description) { res.status(400).json({ success: false, message: 'type, title, description required.' }); return; }
    const complaint = await prisma.hostelComplaint.create({
      data: { studentId: userId, type, title, description, priority: priority ?? 'medium', blockId, roomId },
    });
    res.status(201).json({ success: true, message: 'Complaint filed successfully.', data: complaint });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to file complaint.' }); }
}

// ─── PATCH /complaints/:id — Update complaint status ────────────
export async function updateComplaint(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    if (!(await isHostelStaff(userId, role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { status, resolution } = req.body;
    const id = String(req.params.id);
    const data: any = { status };
    if (status === 'resolved' || status === 'closed') {
      data.resolvedById = userId;
      data.resolvedAt = new Date();
      data.resolution = resolution;
    }
    const updated = await prisma.hostelComplaint.update({ where: { id }, data });
    res.json({ success: true, message: `Complaint marked as ${status}.`, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update complaint.' }); }
}

// ─── GET /fees — Fee records ────────────────────────────────────
export async function getFees(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;
    const isStaff = await isHostelStaff(userId, role);
    const where: any = isStaff ? {} : { studentId: userId };
    const { status } = req.query as Record<string, string>;
    if (status && status !== 'all') where.status = status;
    const fees = await prisma.hostelFee.findMany({
      where,
      orderBy: { dueDate: 'desc' },
      include: { student: { select: { fullName: true, email: true, profile: { select: { rollNumber: true } } } } },
    });
    res.json({ success: true, data: fees });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch fees.' }); }
}

// ─── POST /fees — Create fee record (admin/warden) ──────────────
export async function createFee(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { studentId, amount, feeType, period, dueDate, remarks } = req.body;
    if (!studentId || !amount || !period || !dueDate) { res.status(400).json({ success: false, message: 'studentId, amount, period, dueDate required.' }); return; }
    const fee = await prisma.hostelFee.create({
      data: { studentId, amount: parseFloat(amount), feeType: feeType ?? 'hostel', period, dueDate: new Date(dueDate), remarks },
    });
    res.status(201).json({ success: true, data: fee });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to create fee.' }); }
}

// ─── PATCH /fees/:id — Mark fee paid (admin/warden) ─────────────
export async function markFeePaid(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { paymentRef } = req.body;
    const updated = await prisma.hostelFee.update({
      where: { id: String(req.params.id) },
      data: { status: 'paid', paidDate: new Date(), paymentRef },
    });
    res.json({ success: true, message: 'Fee marked as paid.', data: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to mark fee paid.' }); }
}

// ─── GET /stats — Hostel dashboard stats (warden/admin) ─────────
export async function getHostelStats(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const [totalBlocks, totalRooms, activeAllocations, pendingPasses, openComplaints, urgentComplaints, pendingFees] = await Promise.all([
      prisma.hostelBlock.count({ where: { isActive: true } }),
      prisma.hostelRoom.count(),
      prisma.roomAllocation.count({ where: { status: 'active' } }),
      prisma.gatePass.count({ where: { status: 'pending' } }),
      prisma.hostelComplaint.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.hostelComplaint.count({ where: { status: 'open', priority: 'urgent' } }),
      prisma.hostelFee.count({ where: { status: 'pending' } }),
    ]);
    const feeSum = await prisma.hostelFee.aggregate({ where: { status: 'pending' }, _sum: { amount: true } });
    res.json({
      success: true,
      data: { totalBlocks, totalRooms, activeAllocations, pendingPasses, openComplaints, urgentComplaints, pendingFees, pendingFeeTotal: feeSum._sum.amount ?? 0 },
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch stats.' }); }
}

// ─── GET /students?q= — Student search for allocation ───────────
export async function searchStudents(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const q = String(req.query.q ?? '');
    if (q.trim().length < 2) { res.json({ success: true, data: [] }); return; }
    const students = await prisma.user.findMany({
      where: { role: 'student', OR: [{ fullName: { contains: q } }, { email: { contains: q } }, { profile: { rollNumber: { contains: q } } }] },
      take: 10,
      select: { id: true, fullName: true, email: true, profile: { select: { rollNumber: true, course: true, year: true, section: true } } },
    });
    res.json({ success: true, data: students });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to search.' }); }
}

// ─── PATCH /staff/:userId — Toggle warden (admin) ───────────────
export async function toggleWarden(req: Request, res: Response): Promise<void> {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ success: false, message: 'Admin only.' }); return; }
    const { isWarden, wardenBlock } = req.body;
    const targetId = String(req.params.userId);
    const profile = await prisma.profile.upsert({
      where: { userId: targetId },
      update: { isWarden, wardenBlock: wardenBlock ?? null },
      create: {
        userId: targetId,
        idCardNumber: `SC-WAR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        isWarden,
        wardenBlock: wardenBlock ?? null,
      },
    });
    res.json({ success: true, message: `User ${isWarden ? 'promoted to' : 'removed from'} Hostel Warden.`, data: profile });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update warden status.' }); }
}

// ─── GET /all-allocations — All allocations (warden/admin) ──────
export async function getAllAllocations(req: Request, res: Response): Promise<void> {
  try {
    if (!(await isHostelStaff(req.user!.userId, req.user!.role))) { res.status(403).json({ success: false, message: 'Staff only.' }); return; }
    const { status } = req.query as Record<string, string>;
    const allocations = await prisma.roomAllocation.findMany({
      where: status && status !== 'all' ? { status } : { status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { fullName: true, email: true, profile: { select: { rollNumber: true, course: true, year: true, phone: true } } } },
        room: { include: { block: { select: { name: true } } } },
      },
    });
    res.json({ success: true, data: allocations });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch allocations.' }); }
}
