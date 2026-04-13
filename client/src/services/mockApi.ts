/**
 * mockApi.ts — Implements every API endpoint using the localStorage mockDb.
 * Activated automatically when the real backend is unreachable.
 */

import { getDb, saveDb, uid } from './mockDb';

// ─── Fake JWT ─────────────────────────────────────────────────────
function makeToken(userId: string): string {
  return btoa(JSON.stringify({ userId, exp: Date.now() + 15 * 60 * 1000 }));
}

function decodeToken(token: string): { userId: string } | null {
  try { return JSON.parse(atob(token)); } catch { return null; }
}

function currentUserId(): string | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return decodeToken(token)?.userId ?? null;
}

function currentUser() {
  const id = currentUserId();
  if (!id) return null;
  const db = getDb();
  const user = db.users.find((u: any) => u.id === id);
  if (!user) return null;
  const profile = db.profiles.find((p: any) => p.userId === id) ?? null;
  return { ...user, profile };
}

// ─── Simulate async delay ─────────────────────────────────────────
const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));

// ─── Response builders ─────────────────────────────────────────────
const ok   = (data?: any, message = 'Success') => ({ success: true, message, data });
const fail = (message: string, status = 400)   => { const e: any = new Error(message); e.status = status; e.success = false; e.message = message; throw e; };

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════
export const mockAuth = {
  async register(body: any) {
    await delay();
    const db = getDb();
    if (db.users.find((u: any) => u.email === body.email)) fail('An account with this email already exists', 409);
    const newUser = { id: uid(), email: body.email, password: body.password, fullName: body.fullName, role: body.role ?? 'student', isVerified: true, createdAt: new Date().toISOString(), lastLoginAt: null };
    db.users.push(newUser);
    db.profiles.push({ userId: newUser.id, idCardNumber: `SC-${body.role?.toUpperCase().slice(0,3) ?? 'STU'}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`, department: null, phone: null, bio: null, avatarBase64: null, rollNumber: null, employeeId: null, year: null, section: null, course: null, bloodGroup: null, hostelName: null, hostelRoom: null, isWarden: false, designation: null });
    saveDb(db);
    return ok({ id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role, isVerified: true }, '✅ DEV MODE: Account created and auto-verified. You can log in immediately.');
  },

  async login(body: any) {
    await delay();
    const db = getDb();
    const user = db.users.find((u: any) => u.email.toLowerCase() === body.email.toLowerCase());
    if (!user) fail('Invalid email or password', 401);
    // Accept any password in demo mode — or check if it matches
    if (user.password && user.password !== body.password) fail('Invalid email or password', 401);
    user.lastLoginAt = new Date().toISOString();
    saveDb(db);
    const token = makeToken(user.id);
    localStorage.setItem('accessToken', token);
    return ok({ accessToken: token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isVerified: true } }, 'Login successful');
  },

  async me() {
    await delay(50);
    const user = currentUser();
    if (!user) fail('Not authenticated', 401);
    return ok({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, isVerified: true, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt });
  },

  async logout() {
    localStorage.removeItem('accessToken');
    return ok(undefined, 'Logged out successfully');
  },

  async forgotPassword(_body: any) { await delay(); return ok(undefined, 'If an account with that email exists, a reset code has been sent.'); },
  async resetPassword(_body: any) { await delay(); return ok(undefined, 'Password has been reset successfully. Please log in with your new password.'); },
  async verifyOtp(_body: any) { await delay(); return ok({ verified: true }, 'Email verified successfully. You can now log in.'); },
  async resendOtp(_body: any) { await delay(); return ok(undefined, 'A new verification code has been sent to your email.'); },
  async refresh() { const t = localStorage.getItem('accessToken'); if (!t) fail('No token', 401); return ok({ accessToken: t }); },
};

// ═══════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════
export const mockProfile = {
  async getMyProfile() {
    await delay();
    const user = currentUser();
    if (!user) fail('Not authenticated', 401);
    return ok({ ...user });
  },
  async updateMyProfile(body: any) {
    await delay();
    const db = getDb(); const id = currentUserId()!;
    const idx = db.profiles.findIndex((p: any) => p.userId === id);
    if (idx === -1) fail('Profile not found', 404);
    db.profiles[idx] = { ...db.profiles[idx], ...body };
    saveDb(db);
    return ok(db.profiles[idx], 'Profile updated successfully.');
  },
  async listUsers(params: any) {
    await delay();
    const db = getDb();
    let users = db.users.map((u: any) => ({ ...u, profile: db.profiles.find((p: any) => p.userId === u.id) ?? null }));
    if (params?.role) users = users.filter((u: any) => u.role === params.role);
    if (params?.search) users = users.filter((u: any) => u.fullName.toLowerCase().includes(params.search.toLowerCase()) || u.email.toLowerCase().includes(params.search.toLowerCase()));
    const page = params?.page ?? 1; const limit = params?.limit ?? 20;
    const total = users.length;
    users = users.slice((page - 1) * limit, page * limit);
    return ok({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  },
  async getUserById(userId: string) {
    await delay();
    const db = getDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) fail('User not found', 404);
    return ok({ ...user, profile: db.profiles.find((p: any) => p.userId === userId) ?? null });
  },
  async updateUserRole(userId: string, role: string) {
    await delay();
    const db = getDb();
    const idx = db.users.findIndex((u: any) => u.id === userId);
    if (idx === -1) fail('User not found', 404);
    db.users[idx].role = role;
    saveDb(db);
    return ok(db.users[idx], `Role updated to '${role}'.`);
  },
  async updateUserProfile(userId: string, body: any) {
    await delay();
    const db = getDb();
    const idx = db.profiles.findIndex((p: any) => p.userId === userId);
    if (idx === -1) fail('Profile not found', 404);
    db.profiles[idx] = { ...db.profiles[idx], ...body };
    saveDb(db);
    return ok({ profile: db.profiles[idx] }, 'Profile updated.');
  },
  async bulkUpdateProfiles(userIds: string[], updates: any) {
    await delay();
    const db = getDb();
    userIds.forEach(id => {
      const idx = db.profiles.findIndex((p: any) => p.userId === id);
      if (idx !== -1) db.profiles[idx] = { ...db.profiles[idx], ...updates };
    });
    saveDb(db);
    return ok({ updatedCount: userIds.length }, `Updated ${userIds.length} profile(s).`);
  },
};

// ═══════════════════════════════════════════════════════════════════
// NOTICES
// ═══════════════════════════════════════════════════════════════════
export const mockNotice = {
  async list(params: any) {
    await delay();
    const db = getDb();
    let items = [...db.notices].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (params?.category && params.category !== 'all') items = items.filter((n: any) => n.category === params.category);
    const page = params?.page ?? 1; const limit = params?.limit ?? 10;
    return ok({ notices: items.slice((page - 1) * limit, page * limit), total: items.length, page, totalPages: Math.ceil(items.length / limit) });
  },
  async create(body: any) {
    await delay();
    const db = getDb(); const user = currentUser()!;
    const notice = { id: uid(), ...body, authorId: user.id, authorName: user.fullName, createdAt: new Date().toISOString() };
    db.notices.unshift(notice);
    saveDb(db);
    return ok(notice, 'Notice created successfully.');
  },
  async getById(id: string) {
    await delay();
    const db = getDb();
    const notice = db.notices.find((n: any) => n.id === id);
    if (!notice) fail('Notice not found', 404);
    return ok(notice);
  },
  async delete(id: string) {
    await delay();
    const db = getDb();
    db.notices = db.notices.filter((n: any) => n.id !== id);
    saveDb(db);
    return ok(undefined, 'Notice deleted.');
  },
  async bulletin() {
    await delay();
    const db = getDb();
    const items = db.notices.slice(0, 5).map((n: any) => ({ id: n.id, title: n.title, category: n.category, createdAt: n.createdAt }));
    return ok(items);
  },
};

// ═══════════════════════════════════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════════════════════════════════
export const mockLibrary = {
  async getBooks(params: any) {
    await delay();
    const db = getDb();
    let books = [...db.books];
    if (params?.category) books = books.filter((b: any) => b.category.toLowerCase().includes(params.category.toLowerCase()));
    if (params?.search) books = books.filter((b: any) => b.title.toLowerCase().includes(params.search.toLowerCase()) || b.author.toLowerCase().includes(params.search.toLowerCase()));
    const page = params?.page ?? 1; const limit = params?.limit ?? 20;
    return ok({ books: books.slice((page-1)*limit, page*limit), total: books.length });
  },
  async createBook(body: any) {
    await delay();
    const db = getDb();
    const book = { id: uid(), ...body, availableCopies: body.totalCopies ?? 1, createdAt: new Date().toISOString() };
    db.books.push(book);
    saveDb(db);
    return ok(book);
  },
  async updateBook(id: string, body: any) {
    await delay();
    const db = getDb(); const idx = db.books.findIndex((b: any) => b.id === id);
    if (idx === -1) fail('Book not found', 404);
    db.books[idx] = { ...db.books[idx], ...body };
    saveDb(db);
    return ok(db.books[idx]);
  },
  async deleteBook(id: string) {
    await delay();
    const db = getDb();
    db.books = db.books.filter((b: any) => b.id !== id);
    saveDb(db);
    return ok(undefined, 'Book deleted.');
  },
  async getMyIssues() {
    await delay();
    const db = getDb(); const uid_ = currentUserId()!;
    const issues = db.issues.filter((i: any) => i.studentId === uid_).map((i: any) => ({ ...i, book: db.books.find((b: any) => b.id === i.bookId) }));
    return ok(issues);
  },
  async getAllIssues(params: any) {
    await delay();
    const db = getDb();
    let issues = [...db.issues].map((i: any) => ({ ...i, book: db.books.find((b: any) => b.id === i.bookId), student: db.users.find((u: any) => u.id === i.studentId) }));
    if (params?.status) issues = issues.filter((i: any) => i.status === params.status);
    return ok({ issues, total: issues.length });
  },
  async issueBook(body: any) {
    await delay();
    const db = getDb();
    const book = db.books.find((b: any) => b.id === body.bookId);
    if (!book) fail('Book not found', 404);
    if (book.availableCopies <= 0) fail('No copies available', 409);
    const issue = { id: uid(), bookId: body.bookId, studentId: body.studentId, dueDate: body.dueDate, issuedDate: new Date().toISOString(), status: 'issued', returnedDate: null, penaltyAmount: 0, penaltyPaid: false, remarks: body.remarks ?? null };
    db.issues.push(issue);
    book.availableCopies -= 1;
    saveDb(db);
    return ok(issue, 'Book issued successfully.');
  },
  async returnBook(issueId: string, _remarks: any) {
    await delay();
    const db = getDb(); const idx = db.issues.findIndex((i: any) => i.id === issueId);
    if (idx === -1) fail('Issue not found', 404);
    db.issues[idx].status = 'returned';
    db.issues[idx].returnedDate = new Date().toISOString();
    const book = db.books.find((b: any) => b.id === db.issues[idx].bookId);
    if (book) book.availableCopies += 1;
    saveDb(db);
    return ok(db.issues[idx], 'Book returned successfully.');
  },
  async getStats() {
    await delay();
    const db = getDb();
    return ok({ totalBooks: db.books.length, totalIssued: db.issues.filter((i: any) => i.status === 'issued').length, overdueBooks: db.issues.filter((i: any) => i.status === 'issued' && new Date(i.dueDate) < new Date()).length, totalMembers: db.users.length });
  },
  async searchStudents(q: string) {
    await delay();
    const db = getDb();
    return ok(db.users.filter((u: any) => u.role === 'student' && (u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))).slice(0, 10).map((u: any) => ({ ...u, profile: db.profiles.find((p: any) => p.userId === u.id) })));
  },
  async toggleLibrarian(userId: string, isLibrarian: boolean) {
    await delay();
    const db = getDb(); const idx = db.profiles.findIndex((p: any) => p.userId === userId);
    if (idx !== -1) { db.profiles[idx].isLibrarian = isLibrarian; saveDb(db); }
    return ok({}, `User ${isLibrarian ? 'set as' : 'removed from'} librarian.`);
  },
};

// ═══════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════
export const mockEvent = {
  async list(params: any) {
    await delay();
    const db = getDb();
    let events = [...db.events].sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    if (params?.category && params.category !== 'all') events = events.filter((e: any) => e.category === params.category);
    if (params?.search) events = events.filter((e: any) => e.title.toLowerCase().includes(params.search.toLowerCase()));
    return ok({ events, total: events.length });
  },
  async create(body: any) {
    await delay();
    const db = getDb(); const user = currentUser()!;
    const event = { id: uid(), ...body, createdById: user.id, files: [], createdAt: new Date().toISOString() };
    db.events.push(event);
    saveDb(db);
    return ok(event, 'Event created.');
  },
  async getById(id: string) {
    await delay();
    const db = getDb(); const ev = db.events.find((e: any) => e.id === id);
    if (!ev) fail('Event not found', 404);
    return ok(ev);
  },
  async update(id: string, body: any) {
    await delay();
    const db = getDb(); const idx = db.events.findIndex((e: any) => e.id === id);
    if (idx === -1) fail('Event not found', 404);
    db.events[idx] = { ...db.events[idx], ...body };
    saveDb(db);
    return ok(db.events[idx]);
  },
  async delete(id: string) {
    await delay();
    const db = getDb(); db.events = db.events.filter((e: any) => e.id !== id); saveDb(db);
    return ok(undefined, 'Event deleted.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// HOSTEL
// ═══════════════════════════════════════════════════════════════════
export const mockHostel = {
  async getBlocks() {
    await delay(); const db = getDb();
    return ok(db.hostelBlocks.map((b: any) => ({ ...b, rooms: db.hostelRooms.filter((r: any) => r.blockId === b.id) })));
  },
  async getRooms(params: any) {
    await delay(); const db = getDb();
    let rooms = db.hostelRooms.map((r: any) => ({ ...r, block: db.hostelBlocks.find((b: any) => b.id === r.blockId), allocations: db.roomAllocations.filter((a: any) => a.roomId === r.id && a.status === 'active').map((a: any) => ({ ...a, student: db.users.find((u: any) => u.id === a.studentId) })) }));
    if (params?.blockId) rooms = rooms.filter((r: any) => r.blockId === params.blockId);
    if (params?.available === 'true') rooms = rooms.filter((r: any) => r.isAvailable);
    return ok(rooms);
  },
  async getMyRoom() {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const allocation = db.roomAllocations.find((a: any) => a.studentId === uid_ && a.status === 'active');
    if (!allocation) return ok({ allocation: null, fees: [] });
    const room = { ...db.hostelRooms.find((r: any) => r.id === allocation.roomId), block: db.hostelBlocks.find((b: any) => b.id === allocation?.roomId) };
    const fees = db.hostelFees.filter((f: any) => f.studentId === uid_);
    return ok({ allocation: { ...allocation, room }, fees });
  },
  async getGatePasses(params: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!; const user = currentUser()!;
    let passes = user.role === 'student' ? db.gatePasses.filter((p: any) => p.studentId === uid_) : [...db.gatePasses];
    if (params?.status && params.status !== 'all') passes = passes.filter((p: any) => p.status === params.status);
    return ok(passes.map((p: any) => ({ ...p, student: db.users.find((u: any) => u.id === p.studentId) })));
  },
  async applyGatePass(body: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const pass = { id: uid(), studentId: uid_, ...body, outDateTime: new Date(body.outDateTime), expectedReturn: new Date(body.expectedReturn), status: 'pending', approvedById: null, approvedAt: null, actualReturn: null, createdAt: new Date().toISOString() };
    db.gatePasses.push(pass); saveDb(db);
    return ok(pass, 'Gate pass application submitted.');
  },
  async updateGatePass(id: string, body: any) {
    await delay(); const db = getDb(); const idx = db.gatePasses.findIndex((p: any) => p.id === id);
    if (idx === -1) fail('Gate pass not found', 404);
    db.gatePasses[idx] = { ...db.gatePasses[idx], ...body };
    if (body.status === 'approved' || body.status === 'rejected') { db.gatePasses[idx].approvedById = currentUserId(); db.gatePasses[idx].approvedAt = new Date().toISOString(); }
    saveDb(db);
    return ok(db.gatePasses[idx], `Gate pass ${body.status}.`);
  },
  async getMessMenu() { await delay(); return ok(getDb().messMenu); },
  async getComplaints(params: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!; const user = currentUser()!;
    let items = user.role === 'student' ? db.hostelComplaints.filter((c: any) => c.studentId === uid_) : [...db.hostelComplaints];
    if (params?.status && params.status !== 'all') items = items.filter((c: any) => c.status === params.status);
    return ok(items);
  },
  async fileComplaint(body: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const complaint = { id: uid(), studentId: uid_, ...body, status: 'open', resolvedById: null, resolvedAt: null, resolution: null, createdAt: new Date().toISOString() };
    db.hostelComplaints.push(complaint); saveDb(db);
    return ok(complaint, 'Complaint filed successfully.');
  },
  async updateComplaint(id: string, body: any) {
    await delay(); const db = getDb(); const idx = db.hostelComplaints.findIndex((c: any) => c.id === id);
    if (idx === -1) fail('Complaint not found', 404);
    db.hostelComplaints[idx] = { ...db.hostelComplaints[idx], ...body };
    if (body.status === 'resolved') { db.hostelComplaints[idx].resolvedById = currentUserId(); db.hostelComplaints[idx].resolvedAt = new Date().toISOString(); }
    saveDb(db);
    return ok(db.hostelComplaints[idx]);
  },
  async getFees(params: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!; const user = currentUser()!;
    let fees = user.role === 'student' ? db.hostelFees.filter((f: any) => f.studentId === uid_) : [...db.hostelFees];
    if (params?.status && params.status !== 'all') fees = fees.filter((f: any) => f.status === params.status);
    return ok(fees.map((f: any) => ({ ...f, student: db.users.find((u: any) => u.id === f.studentId) })));
  },
  async getStats() {
    await delay(); const db = getDb();
    return ok({ totalBlocks: db.hostelBlocks.length, totalRooms: db.hostelRooms.length, activeAllocations: db.roomAllocations.filter((a: any) => a.status === 'active').length, pendingPasses: db.gatePasses.filter((p: any) => p.status === 'pending').length, openComplaints: db.hostelComplaints.filter((c: any) => c.status === 'open').length, urgentComplaints: db.hostelComplaints.filter((c: any) => c.status === 'open' && c.priority === 'urgent').length, pendingFees: db.hostelFees.filter((f: any) => f.status === 'pending').length, pendingFeeTotal: db.hostelFees.filter((f: any) => f.status === 'pending').reduce((s: number, f: any) => s + f.amount, 0) });
  },
  async searchStudents(q: string) {
    await delay(); const db = getDb();
    return ok(db.users.filter((u: any) => u.role === 'student' && (u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))).slice(0, 10).map((u: any) => ({ ...u, profile: db.profiles.find((p: any) => p.userId === u.id) })));
  },
};

// ═══════════════════════════════════════════════════════════════════
// COMMUNITIES
// ═══════════════════════════════════════════════════════════════════
export const mockCommunity = {
  async list() { await delay(); return ok(getDb().communities); },
  async create(body: any) {
    await delay(); const db = getDb();
    const c = { id: uid(), ...body, createdAt: new Date().toISOString() };
    db.communities.push(c); saveDb(db); return ok(c);
  },
  async update(id: string, body: any) {
    await delay(); const db = getDb(); const idx = db.communities.findIndex((c: any) => c.id === id);
    if (idx === -1) fail('Not found', 404);
    db.communities[idx] = { ...db.communities[idx], ...body }; saveDb(db); return ok(db.communities[idx]);
  },
  async delete(id: string) {
    await delay(); const db = getDb(); db.communities = db.communities.filter((c: any) => c.id !== id); saveDb(db); return ok(undefined, 'Deleted.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
export const mockManagement = {
  async list() { await delay(); return ok(getDb().management.sort((a: any, b: any) => a.order - b.order)); },
  async create(body: any) {
    await delay(); const db = getDb();
    const e = { id: uid(), ...body }; db.management.push(e); saveDb(db); return ok(e);
  },
  async update(id: string, body: any) {
    await delay(); const db = getDb(); const idx = db.management.findIndex((e: any) => e.id === id);
    if (idx === -1) fail('Not found', 404);
    db.management[idx] = { ...db.management[idx], ...body }; saveDb(db); return ok(db.management[idx]);
  },
  async delete(id: string) {
    await delay(); const db = getDb(); db.management = db.management.filter((e: any) => e.id !== id); saveDb(db); return ok(undefined, 'Deleted.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// LOST & FOUND
// ═══════════════════════════════════════════════════════════════════
export const mockLostFound = {
  async list(params: any) {
    await delay(); const db = getDb();
    let items = [...db.lostFound].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (params?.status) items = items.filter((i: any) => i.status === params.status);
    if (params?.category) items = items.filter((i: any) => i.category === params.category);
    if (params?.search) items = items.filter((i: any) => i.title.toLowerCase().includes(params.search.toLowerCase()));
    return ok({ items, total: items.length });
  },
  async getById(id: string) { await delay(); const db = getDb(); const item = db.lostFound.find((i: any) => i.id === id); if (!item) fail('Not found', 404); return ok(item); },
  async create(body: any) {
    await delay(); const db = getDb(); const user = currentUser()!;
    const item = { id: uid(), ...body, reporterId: user.id, reporterName: user.fullName, images: [], createdAt: new Date().toISOString() };
    db.lostFound.push(item); saveDb(db); return ok(item);
  },
  async update(id: string, body: any) {
    await delay(); const db = getDb(); const idx = db.lostFound.findIndex((i: any) => i.id === id);
    if (idx === -1) fail('Not found', 404);
    db.lostFound[idx] = { ...db.lostFound[idx], ...body }; saveDb(db); return ok(db.lostFound[idx]);
  },
  async delete(id: string) { await delay(); const db = getDb(); db.lostFound = db.lostFound.filter((i: any) => i.id !== id); saveDb(db); return ok(undefined, 'Deleted.'); },
  async claim(id: string) {
    await delay(); const db = getDb(); const idx = db.lostFound.findIndex((i: any) => i.id === id);
    if (idx !== -1) { db.lostFound[idx].status = 'claimed'; saveDb(db); }
    return ok(db.lostFound[idx]);
  },
};

// ═══════════════════════════════════════════════════════════════════
// MAP PINS
// ═══════════════════════════════════════════════════════════════════
export const mockMapPin = {
  async list() { await delay(); return ok(getDb().mapPins); },
  async create(body: any) {
    await delay(); const db = getDb(); const pin = { id: uid(), ...body, createdById: currentUserId(), createdAt: new Date().toISOString() };
    db.mapPins.push(pin); saveDb(db); return ok(pin);
  },
  async delete(id: string) { await delay(); const db = getDb(); db.mapPins = db.mapPins.filter((p: any) => p.id !== id); saveDb(db); return ok(undefined, 'Pin deleted.'); },
};

// ═══════════════════════════════════════════════════════════════════
// CLASSROOM
// ═══════════════════════════════════════════════════════════════════
export const mockClassroom = {
  async getMyClassroom() {
    await delay(); const db = getDb(); const uid_ = currentUserId()!; const user = currentUser()!;
    const memberships = db.classroomMembers.filter((m: any) => m.userId === uid_);
    const classrooms = memberships.map((m: any) => ({ ...db.classrooms.find((c: any) => c.id === m.classroomId), role: m.role })).filter(Boolean);
    return ok(user.role === 'faculty' ? classrooms.filter((c: any) => c.facultyId === uid_) : classrooms);
  },
  async createClassroom(course: string, section: string) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const cls = { id: uid(), name: `${course} - Section ${section}`, course, section, facultyId: uid_, createdAt: new Date().toISOString() };
    db.classrooms.push(cls);
    db.classroomMembers.push({ id: uid(), classroomId: cls.id, userId: uid_, role: 'faculty', joinedAt: new Date().toISOString() });
    saveDb(db); return ok(cls);
  },
  async getMembers(id: string) {
    await delay(); const db = getDb();
    const members = db.classroomMembers.filter((m: any) => m.classroomId === id).map((m: any) => ({ ...m, user: db.users.find((u: any) => u.id === m.userId) }));
    return ok(members);
  },
  async getNotes(id: string) { await delay(); const db = getDb(); return ok(db.classroomNotes.filter((n: any) => n.classroomId === id)); },
  async uploadNote(id: string, body: any) {
    await delay(); const db = getDb(); const user = currentUser()!;
    const note = { id: uid(), classroomId: id, uploaderId: user.id, uploaderName: user.fullName, ...body, createdAt: new Date().toISOString() };
    db.classroomNotes.push(note); saveDb(db); return ok(note, 'Note uploaded.');
  },
  async deleteNote(classroomId: string, noteId: string) {
    await delay(); const db = getDb(); db.classroomNotes = db.classroomNotes.filter((n: any) => !(n.classroomId === classroomId && n.id === noteId)); saveDb(db); return ok(undefined, 'Deleted.');
  },
  async getMessages(id: string) { await delay(); const db = getDb(); return ok(db.classroomMessages.filter((m: any) => m.classroomId === id)); },
  async postMessage(id: string, content: string) {
    await delay(); const db = getDb(); const user = currentUser()!;
    const msg = { id: uid(), classroomId: id, senderId: user.id, senderName: user.fullName, content, sentAt: new Date().toISOString() };
    db.classroomMessages.push(msg); saveDb(db); return ok(msg);
  },
};

// ═══════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════
export const mockAssignment = {
  async list(classroomId: string) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!; const user = currentUser()!;
    const assignments = db.assignments.filter((a: any) => a.classroomId === classroomId);
    return ok(assignments.map((a: any) => ({
      ...a,
      createdBy: db.users.find((u: any) => u.id === a.createdById),
      submissions: (user.role === 'faculty' || user.role === 'admin')
        ? db.assignmentSubmissions.filter((s: any) => s.assignmentId === a.id).map((s: any) => ({ ...s, student: db.users.find((u: any) => u.id === s.studentId) }))
        : db.assignmentSubmissions.filter((s: any) => s.assignmentId === a.id && s.studentId === uid_),
    })));
  },
  async create(classroomId: string, body: any) {
    await delay(); const db = getDb(); const user = currentUser()!;
    const a = { id: uid(), classroomId, ...body, createdById: user.id, createdByName: user.fullName, dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : null, createdAt: new Date().toISOString() };
    db.assignments.push(a); saveDb(db); return ok(a);
  },
  async submit(assignmentId: string, body: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const existingIdx = db.assignmentSubmissions.findIndex((s: any) => s.assignmentId === assignmentId && s.studentId === uid_);
    if (existingIdx !== -1) { db.assignmentSubmissions[existingIdx] = { ...db.assignmentSubmissions[existingIdx], ...body, submittedAt: new Date().toISOString() }; }
    else { db.assignmentSubmissions.push({ id: uid(), assignmentId, studentId: uid_, ...body, submittedAt: new Date().toISOString(), grade: null, feedback: null }); }
    saveDb(db); return ok(db.assignmentSubmissions.find((s: any) => s.assignmentId === assignmentId && s.studentId === uid_));
  },
  async getSubmission(subId: string) {
    await delay(); const db = getDb(); const sub = db.assignmentSubmissions.find((s: any) => s.id === subId);
    if (!sub) fail('Not found', 404);
    return ok({ ...sub, student: db.users.find((u: any) => u.id === sub.studentId) });
  },
  async grade(subId: string, body: any) {
    await delay(); const db = getDb(); const idx = db.assignmentSubmissions.findIndex((s: any) => s.id === subId);
    if (idx === -1) fail('Not found', 404);
    db.assignmentSubmissions[idx] = { ...db.assignmentSubmissions[idx], ...body }; saveDb(db);
    return ok(db.assignmentSubmissions[idx]);
  },
};

// ═══════════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════════
export const mockChat = {
  async searchUsers(params: any) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    let users = db.users.filter((u: any) => u.id !== uid_);
    if (params?.name) users = users.filter((u: any) => u.fullName.toLowerCase().includes(params.name.toLowerCase()));
    return ok(users.slice(0, 30).map((u: any) => ({ ...u, profile: db.profiles.find((p: any) => p.userId === u.id) })));
  },
  async getConversations() {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const convos = db.chatConversations.filter((c: any) => c.participants?.includes(uid_))
      .map((c: any) => ({ ...c, participants: c.participants.map((p: string) => db.users.find((u: any) => u.id === p)), messages: db.chatMessages.filter((m: any) => m.conversationId === c.id).slice(-1) }));
    return ok(convos);
  },
  async startConversation(targetUserId: string) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const existing = db.chatConversations.find((c: any) => c.participants?.includes(uid_) && c.participants?.includes(targetUserId));
    if (existing) return ok(existing);
    const convo = { id: uid(), participants: [uid_, targetUserId], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.chatConversations.push(convo); saveDb(db); return ok(convo);
  },
  async getMessages(convoId: string) {
    await delay(); const db = getDb();
    const msgs = db.chatMessages.filter((m: any) => m.conversationId === convoId).map((m: any) => ({ ...m, sender: db.users.find((u: any) => u.id === m.senderId) }));
    return ok(msgs);
  },
  async sendMessage(convoId: string, content: string) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!; const user = currentUser()!;
    const msg = { id: uid(), conversationId: convoId, senderId: uid_, content: content.trim(), sentAt: new Date().toISOString(), isRead: false, sender: { id: uid_, fullName: user.fullName } };
    db.chatMessages.push(msg); saveDb(db); return ok(msg);
  },
  async blockUser(_userId: string) { return ok(undefined, 'User blocked'); },
  async unblockUser(_userId: string) { return ok(undefined, 'User unblocked'); },
  async getBlocked() { return ok([]); },
};

// ═══════════════════════════════════════════════════════════════════
// ACADEMICS
// ═══════════════════════════════════════════════════════════════════
export const mockAcademics = {
  async getSubjects(params: any) {
    await delay(); const db = getDb(); let s = [...db.subjects];
    if (params?.semester) s = s.filter((x: any) => x.semester === Number(params.semester));
    if (params?.department) s = s.filter((x: any) => x.department === params.department);
    return ok(s);
  },
  async createSubject(body: any) {
    await delay(); const db = getDb(); const s = { id: uid(), ...body, createdAt: new Date().toISOString() };
    db.subjects.push(s); saveDb(db); return ok(s);
  },
  async getMyMarks() { await delay(); const db = getDb(); const uid_ = currentUserId()!; return ok(db.marks.filter((m: any) => m.studentId === uid_).map((m: any) => ({ ...m, subject: db.subjects.find((s: any) => s.id === m.subjectId) }))); },
  async uploadMark(body: any) {
    await delay(); const db = getDb();
    const existing = db.marks.findIndex((m: any) => m.studentId === body.studentId && m.subjectId === body.subjectId);
    if (existing !== -1) { db.marks[existing] = { ...db.marks[existing], ...body }; } else { db.marks.push({ id: uid(), ...body, createdAt: new Date().toISOString() }); }
    saveDb(db); return ok(db.marks.find((m: any) => m.studentId === body.studentId && m.subjectId === body.subjectId));
  },
  async getCalendarEvents() { await delay(); return ok(getDb().calendarEvents); },
  async createCalendarEvent(body: any) {
    await delay(); const db = getDb(); const ev = { id: uid(), ...body, createdById: currentUserId(), createdAt: new Date().toISOString() };
    db.calendarEvents.push(ev); saveDb(db); return ok(ev);
  },
  async deleteCalendarEvent(id: string) {
    await delay(); const db = getDb(); db.calendarEvents = db.calendarEvents.filter((e: any) => e.id !== id); saveDb(db); return ok(undefined, 'Deleted.');
  },
  async getMyFees() { return ok([]); },
  async getFeeStructures(_params: any) { return ok([]); },
  async getFeeSummary() { return ok({ totalFees: 0, paidFees: 0, pendingFees: 0 }); },
  async markFeePayment(_body: any) { return ok({}, 'Payment recorded.'); },
  async createFeeStructure(_body: any) { return ok({}); },
  async bulkUploadMarks(marks: any[]) { await Promise.all(marks.map(m => mockAcademics.uploadMark(m))); return ok({ count: marks.length }); },
};

// ═══════════════════════════════════════════════════════════════════
// ATTENDANCE (basic mock)
// ═══════════════════════════════════════════════════════════════════
export const mockAttendance = {
  async createSession(body: any) {
    await delay(); const db = getDb(); const user = currentUser()!;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const session = { id: uid(), ...body, facultyId: user.id, code, isActive: true, createdAt: new Date().toISOString() };
    db.attendanceSessions.push(session); saveDb(db); return ok(session);
  },
  async getMySessions() {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    return ok(db.attendanceSessions.filter((s: any) => s.facultyId === uid_));
  },
  async getSessionByCode(code: string) {
    await delay(); const db = getDb(); const s = db.attendanceSessions.find((x: any) => x.code === code);
    if (!s) fail('Session not found', 404); return ok(s);
  },
  async markAttendance(sessionCode: string) {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    const session = db.attendanceSessions.find((s: any) => s.code === sessionCode);
    if (!session) fail('Invalid session code', 404);
    const already = db.attendanceRecords.find((r: any) => r.sessionId === session.id && r.studentId === uid_);
    if (already) fail('Already marked', 409);
    const record = { id: uid(), sessionId: session.id, studentId: uid_, markedAt: new Date().toISOString(), status: 'present' };
    db.attendanceRecords.push(record); saveDb(db); return ok(record, 'Attendance marked!');
  },
  async getMyRecords() {
    await delay(); const db = getDb(); const uid_ = currentUserId()!;
    return ok(db.attendanceRecords.filter((r: any) => r.studentId === uid_).map((r: any) => ({ ...r, session: db.attendanceSessions.find((s: any) => s.id === r.sessionId) })));
  },
  async getSessionRecords(sessionId: string) {
    await delay(); const db = getDb();
    return ok(db.attendanceRecords.filter((r: any) => r.sessionId === sessionId).map((r: any) => ({ ...r, student: db.users.find((u: any) => u.id === r.studentId) })));
  },
  async getStats() { return ok({ totalSessions: getDb().attendanceSessions.length, totalRecords: getDb().attendanceRecords.length }); },
  async getMyPercentage() { return ok({ percentage: 85, present: 34, total: 40 }); },
  async getTimetable(_section: string) { return ok(null); },
  async uploadTimetable(_section: string, _imageBase64: string) { return ok({}, 'Uploaded.'); },
  async deleteTimetable(_section: string) { return ok(undefined, 'Deleted.'); },
};
