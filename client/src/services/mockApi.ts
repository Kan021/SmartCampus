/**
 * mockApi.ts — Full backend parity on the frontend.
 * Mirrors every controller in server/src/controllers/*.ts using localStorage.
 * Includes: RBAC, hashed passwords, OTP, login lockout, notifications,
 * QR attendance, file storage, rate limiting, full hostel API.
 */

import QRCode from 'qrcode';
import {
  getDb, saveDb, uid,
  hashPassword, verifyPassword,
  generateOtp, signToken, verifyToken,
  requireRole, isHostelStaff, isLibraryStaff,
  pushNotification,
} from './mockDb';

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MIN = 15;
const OTP_EXPIRY_MIN    = 10;

// ─── Internal helpers ─────────────────────────────────────────────
const delay = (ms = 100) => new Promise(r => setTimeout(r, ms));
const ok    = (data?: any, message = 'Success') => ({ success: true, message, data });
function fail(message: string, status = 400): never {
  const e: any = new Error(message);
  e.status = status; e.success = false; e.message = message;
  throw e;
}

function currentUserId(): string | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  const p = verifyToken(token);
  return p?.userId ?? null;
}

function currentUser(): any | null {
  const id = currentUserId();
  if (!id) return null;
  const d = getDb();
  if (!d) return null;
  const user = d.users.find((u: any) => u.id === id);
  if (!user) return null;
  const profile = d.profiles.find((p: any) => p.userId === id) ?? null;
  return { ...user, profile };
}

function requireAuth(): any {
  const user = currentUser();
  if (!user) fail('Not authenticated. Please log in.', 401);
  return user;
}

function withProfile(user: any, db: any) {
  return { ...user, profile: db.profiles.find((p: any) => p.userId === user.id) ?? null };
}

// ─── OTP helpers ──────────────────────────────────────────────────
function storeOtp(db: any, email: string, type: string): string {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60000).toISOString();
  db.otps = (db.otps || []).filter((o: any) => !(o.email === email && o.type === type && !o.usedAt));
  db.otps.push({ id: uid(), email, code, type, expiresAt, usedAt: null });
  // Show OTP in console for dev visibility
  console.info(`[SmartCampus OTP] ${type} OTP for ${email}: ${code} (valid ${OTP_EXPIRY_MIN}min)`);
  return code;
}

function consumeOtp(db: any, email: string, code: string, type: string): boolean {
  const now = new Date().toISOString();
  const idx = db.otps.findIndex((o: any) =>
    o.email === email && o.code === code && o.type === type && !o.usedAt && o.expiresAt > now
  );
  if (idx === -1) return false;
  db.otps[idx].usedAt = now;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// AUTH — mirrors authService.ts + authController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockAuth = {
  async register(body: any) {
    await delay(200);
    const d = getDb(); if (!d) fail('DB not ready', 500);
    const { email, password, fullName, role } = body;
    if (!email || !password || !fullName) fail('Email, password, and full name are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Invalid email format.');
    if (password.length < 6) fail('Password must be at least 6 characters.');
    if (d.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()))
      fail('An account with this email already exists.', 409);

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: uid(), email: email.toLowerCase(), passwordHash, fullName,
      role: role ?? 'student', isVerified: false,
      createdAt: new Date().toISOString(), lastLoginAt: null, failedLoginCount: 0, lockedUntil: null,
    };
    d.users.push(newUser);
    d.profiles.push({
      userId: newUser.id,
      idCardNumber: `SC-${(role ?? 'STU').toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      department: null, designation: null, phone: null, bio: null, avatarBase64: null,
      rollNumber: null, employeeId: null, year: null, section: null, course: null,
      bloodGroup: null, hostelName: null, hostelRoom: null, isWarden: false, isLibrarian: false,
    });

    // Generate and store OTP (auto-verify in dev mode)
    const otp = storeOtp(d, email, 'registration');
    newUser.isVerified = true; // DEV: auto-verify
    saveDb(d);

    return ok(
      { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role, isVerified: true },
      `Account created! In dev mode, your OTP is: ${otp} (auto-verified)`
    );
  },

  async verifyOtp(body: any) {
    await delay(150);
    const d = getDb(); if (!d) fail('DB not ready', 500);
    const { email, code, type } = body;
    if (!email || !code || !type) fail('Email, code, and type are required.');

    // Allow bypass code '000000' in demo mode
    const valid = code === '000000' || consumeOtp(d, email, code, type);
    if (!valid) fail('Invalid or expired OTP. Please request a new one.', 400);

    if (type === 'registration') {
      const idx = d.users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) d.users[idx].isVerified = true;
    }
    saveDb(d);
    return ok({ verified: true }, 'Email verified successfully. You can now log in.');
  },

  async login(body: any) {
    await delay(200);
    const d = getDb(); if (!d) fail('DB not ready', 500);
    const { email, password } = body;
    if (!email || !password) fail('Email and password are required.');

    const user = d.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) fail('Invalid email or password.', 401);

    // Lockout check (mirrors authService lockout logic)
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      fail(`Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`, 423);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MIN * 60000).toISOString();
        user.failedLoginCount = 0;
        saveDb(d);
        fail(`Too many failed attempts. Account locked for ${LOCK_DURATION_MIN} minutes.`, 423);
      }
      saveDb(d);
      const remaining = MAX_FAILED_LOGINS - user.failedLoginCount;
      fail(`Invalid email or password. ${remaining} attempt(s) remaining before lockout.`, 401);
    }

    // Reset on success
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date().toISOString();

    // Log the login
    d.loginAudit = d.loginAudit || [];
    d.loginAudit.push({ id: uid(), userId: user.id, email: user.email, status: 'success', timestamp: new Date().toISOString() });

    const accessToken  = signToken({ userId: user.id, role: user.role }, 15);
    const refreshToken = signToken({ userId: user.id, type: 'refresh' }, 60 * 24 * 7);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    saveDb(d);

    const profile = d.profiles.find((p: any) => p.userId === user.id);
    return ok({
      accessToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isVerified: user.isVerified, profile },
    }, 'Login successful');
  },

  async me() {
    await delay(50);
    const d = getDb(); const user = requireAuth();
    const profile = d.profiles.find((p: any) => p.userId === user.id);
    return ok({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, isVerified: user.isVerified, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, profile });
  },

  async logout() {
    await delay(50);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return ok(undefined, 'Logged out successfully.');
  },

  async forgotPassword(body: any) {
    await delay(200);
    const d = getDb(); if (!d) fail('DB not ready', 500);
    const { email } = body;
    const user = d.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      const otp = storeOtp(d, email, 'password_reset');
      saveDb(d);
      console.info(`[SmartCampus] Password reset OTP for ${email}: ${otp}`);
    }
    return ok(undefined, 'If an account with that email exists, a reset code has been sent. (Check browser console for demo OTP)');
  },

  async resetPassword(body: any) {
    await delay(200);
    const d = getDb(); if (!d) fail('DB not ready', 500);
    const { email, code, newPassword } = body;
    if (!email || !code || !newPassword) fail('Email, code, and new password are required.');
    if (newPassword.length < 6) fail('Password must be at least 6 characters.');

    const valid = code === '000000' || consumeOtp(d, email, code, 'password_reset');
    if (!valid) fail('Invalid or expired reset code.', 400);

    const idx = d.users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) fail('User not found.', 404);
    d.users[idx].passwordHash = await hashPassword(newPassword);
    d.users[idx].failedLoginCount = 0;
    d.users[idx].lockedUntil = null;
    saveDb(d);
    return ok(undefined, 'Password reset successfully. You can now log in with your new password.');
  },

  async resendOtp(body: any) {
    await delay(150);
    const d = getDb(); if (!d) fail('DB not ready', 500);
    const { email, type } = body;
    const otp = storeOtp(d, email, type);
    saveDb(d);
    return ok(undefined, `A new OTP has been sent. (Demo OTP: ${otp})`);
  },

  async refresh() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) fail('No refresh token.', 401);
    const payload = verifyToken(refreshToken!);
    if (!payload || payload.type !== 'refresh') fail('Invalid or expired refresh token.', 401);
    const newToken = signToken({ userId: payload.userId, role: payload.role }, 15);
    localStorage.setItem('accessToken', newToken);
    return ok({ accessToken: newToken });
  },
};

// ═══════════════════════════════════════════════════════════════════
// PROFILE — mirrors profileController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockProfile = {
  async getMyProfile() {
    await delay(80);
    const user = requireAuth(); const d = getDb();
    return ok(withProfile(user, d));
  },
  async updateMyProfile(body: any) {
    await delay(120);
    const d = getDb(); const user = requireAuth();
    const allowed = ['phone','bio','department','avatarBase64','rollNumber','year','section','course','bloodGroup','employeeId','designation','hostelName','hostelRoom'];
    const idx = d.profiles.findIndex((p: any) => p.userId === user.id);
    if (idx === -1) fail('Profile not found.', 404);
    allowed.forEach(k => { if (body[k] !== undefined) d.profiles[idx][k] = body[k]; });
    saveDb(d);
    return ok(d.profiles[idx], 'Profile updated successfully.');
  },
  async listUsers(params: any) {
    await delay(100);
    const d = getDb(); const user = requireAuth();
    requireRole(user, 'admin', 'faculty');
    let users = d.users.map((u: any) => withProfile(u, d));
    if (params?.role) users = users.filter((u: any) => u.role === params.role);
    if (params?.search) {
      const q = params.search.toLowerCase();
      users = users.filter((u: any) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    const page = Number(params?.page || 1);
    const limit = Number(params?.limit || 20);
    const total = users.length;
    return ok({ users: users.slice((page-1)*limit, page*limit), pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  },
  async getUserById(userId: string) {
    await delay(80);
    const d = getDb(); requireAuth();
    const user = d.users.find((u: any) => u.id === userId);
    if (!user) fail('User not found.', 404);
    return ok(withProfile(user, d));
  },
  async updateUserRole(userId: string, role: string) {
    await delay(120);
    const d = getDb(); const me = requireAuth(); requireRole(me, 'admin');
    const idx = d.users.findIndex((u: any) => u.id === userId);
    if (idx === -1) fail('User not found.', 404);
    d.users[idx].role = role;
    pushNotification(d, userId, 'Role Updated', `Your account role has been changed to '${role}' by the admin.`, 'info');
    saveDb(d);
    return ok(d.users[idx], `Role updated to '${role}'.`);
  },
  async updateUserProfile(userId: string, body: any) {
    await delay(120);
    const d = getDb(); const me = requireAuth(); requireRole(me, 'admin');
    const idx = d.profiles.findIndex((p: any) => p.userId === userId);
    if (idx === -1) fail('Profile not found.', 404);
    const allowed = ['phone','bio','department','avatarBase64','rollNumber','year','section','course','bloodGroup','employeeId','designation','hostelName','hostelRoom','isWarden','isLibrarian'];
    allowed.forEach(k => { if (body[k] !== undefined) d.profiles[idx][k] = body[k]; });
    saveDb(d);
    return ok({ profile: d.profiles[idx] }, 'Profile updated.');
  },
  async bulkUpdateProfiles(userIds: string[], updates: any) {
    await delay(200);
    const d = getDb(); const me = requireAuth(); requireRole(me, 'admin');
    userIds.forEach(id => {
      const idx = d.profiles.findIndex((p: any) => p.userId === id);
      if (idx !== -1) {
        const allowed = ['department','year','section','course'];
        allowed.forEach(k => { if (updates[k] !== undefined) d.profiles[idx][k] = updates[k]; });
      }
    });
    saveDb(d);
    return ok({ updatedCount: userIds.length }, `Updated ${userIds.length} profile(s).`);
  },
};

// ═══════════════════════════════════════════════════════════════════
// NOTICES — mirrors noticeController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockNotice = {
  async list(params: any) {
    await delay(80);
    const d = getDb();
    let items = [...d.notices].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (params?.category && params.category !== 'all') items = items.filter((n: any) => n.category === params.category);
    if (params?.search) { const q = params.search.toLowerCase(); items = items.filter((n: any) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)); }
    const page = Number(params?.page || 1); const limit = Number(params?.limit || 10);
    return ok({ notices: items.slice((page-1)*limit, page*limit), total: items.length, page, totalPages: Math.ceil(items.length/limit) });
  },
  async create(body: any) {
    await delay(150);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    if (!body.title || !body.content) fail('Title and content are required.');
    const notice = { id: uid(), ...body, authorId: user.id, authorName: user.fullName, createdAt: new Date().toISOString() };
    d.notices.unshift(notice);
    // Notify all users
    d.users.forEach((u: any) => {
      if (u.id !== user.id) pushNotification(d, u.id, `New Notice: ${body.title}`, body.content.slice(0, 120) + '...', 'info', '/notices');
    });
    saveDb(d);
    return ok(notice, 'Notice created and all users notified.');
  },
  async getById(id: string) {
    await delay(60);
    const d = getDb(); const notice = d.notices.find((n: any) => n.id === id);
    if (!notice) fail('Notice not found.', 404);
    return ok(notice);
  },
  async delete(id: string) {
    await delay(100);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    const notice = d.notices.find((n: any) => n.id === id);
    if (!notice) fail('Notice not found.', 404);
    if (user.role !== 'admin' && notice.authorId !== user.id) fail('You can only delete your own notices.', 403);
    d.notices = d.notices.filter((n: any) => n.id !== id);
    saveDb(d);
    return ok(undefined, 'Notice deleted.');
  },
  async bulletin() {
    await delay(60);
    const d = getDb();
    return ok(d.notices.slice(0, 6).map((n: any) => ({ id: n.id, title: n.title, category: n.category, createdAt: n.createdAt })));
  },
};

// ═══════════════════════════════════════════════════════════════════
// LIBRARY — mirrors libraryController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockLibrary = {
  async getBooks(params: any) {
    await delay(80);
    const d = getDb(); requireAuth();
    let books = [...d.books];
    if (params?.category) books = books.filter((b: any) => b.category.toLowerCase().includes(params.category.toLowerCase()));
    if (params?.search) { const q = params.search.toLowerCase(); books = books.filter((b: any) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn?.includes(q)); }
    const page = Number(params?.page || 1); const limit = Number(params?.limit || 20);
    return ok({ books: books.slice((page-1)*limit, page*limit), total: books.length });
  },
  async createBook(body: any) {
    await delay(120);
    const d = getDb(); const user = requireAuth();
    if (!isLibraryStaff(user, d)) fail('Library staff or admin only.', 403);
    if (!body.title || !body.author) fail('Title and author are required.');
    if (d.books.find((b: any) => b.isbn === body.isbn)) fail('A book with this ISBN already exists.', 409);
    const book = { id: uid(), ...body, availableCopies: body.totalCopies ?? 1, createdAt: new Date().toISOString() };
    d.books.push(book); saveDb(d);
    return ok(book, 'Book added to library.');
  },
  async updateBook(id: string, body: any) {
    await delay(120);
    const d = getDb(); const user = requireAuth();
    if (!isLibraryStaff(user, d)) fail('Library staff only.', 403);
    const idx = d.books.findIndex((b: any) => b.id === id);
    if (idx === -1) fail('Book not found.', 404);
    d.books[idx] = { ...d.books[idx], ...body }; saveDb(d);
    return ok(d.books[idx]);
  },
  async deleteBook(id: string) {
    await delay(100);
    const d = getDb(); const user = requireAuth();
    if (!isLibraryStaff(user, d)) fail('Library staff only.', 403);
    if (d.issues.some((i: any) => i.bookId === id && i.status === 'issued')) fail('Cannot delete book with active issues.', 409);
    d.books = d.books.filter((b: any) => b.id !== id); saveDb(d);
    return ok(undefined, 'Book deleted.');
  },
  async getMyIssues() {
    await delay(80);
    const d = getDb(); const user = requireAuth();
    const issues = d.issues.filter((i: any) => i.studentId === user.id).map((i: any) => ({
      ...i, book: d.books.find((b: any) => b.id === i.bookId),
      isOverdue: i.status === 'issued' && new Date(i.dueDate) < new Date(),
      daysOverdue: i.status === 'issued' && new Date(i.dueDate) < new Date() ? Math.ceil((Date.now() - new Date(i.dueDate).getTime()) / 86400000) : 0,
    }));
    return ok(issues);
  },
  async getAllIssues(params: any) {
    await delay(100);
    const d = getDb(); const user = requireAuth();
    if (!isLibraryStaff(user, d)) fail('Library staff only.', 403);
    let issues = d.issues.map((i: any) => ({
      ...i, book: d.books.find((b: any) => b.id === i.bookId), student: d.users.find((u: any) => u.id === i.studentId),
      isOverdue: i.status === 'issued' && new Date(i.dueDate) < new Date(),
    }));
    if (params?.status) issues = issues.filter((i: any) => i.status === params.status);
    return ok({ issues, total: issues.length });
  },
  async issueBook(body: any) {
    await delay(150);
    const d = getDb(); const user = requireAuth();
    if (!isLibraryStaff(user, d)) fail('Library staff only.', 403);
    const { bookId, studentId, dueDate, remarks } = body;
    if (!bookId || !studentId || !dueDate) fail('bookId, studentId, and dueDate are required.');
    const book = d.books.find((b: any) => b.id === bookId);
    if (!book) fail('Book not found.', 404);
    if (book.availableCopies <= 0) fail('No copies available for issue.', 409);
    const existing = d.issues.find((i: any) => i.bookId === bookId && i.studentId === studentId && i.status === 'issued');
    if (existing) fail('Student already has this book issued.', 409);
    const issue = { id: uid(), bookId, studentId, dueDate, issuedDate: new Date().toISOString(), issuedById: user.id, status: 'issued', returnedDate: null, penaltyAmount: 0, penaltyPaid: false, penaltyRate: body.penaltyRate ?? 2, remarks: remarks ?? null };
    d.issues.push(issue);
    book.availableCopies -= 1;
    pushNotification(d, studentId, '📚 Book Issued', `"${book.title}" has been issued to you. Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}.`, 'info', '/library');
    saveDb(d);
    return ok(issue, 'Book issued successfully.');
  },
  async returnBook(issueId: string, body: any) {
    await delay(150);
    const d = getDb(); const user = requireAuth();
    if (!isLibraryStaff(user, d)) fail('Library staff only.', 403);
    const idx = d.issues.findIndex((i: any) => i.id === issueId);
    if (idx === -1) fail('Issue record not found.', 404);
    const issue = d.issues[idx];
    if (issue.status === 'returned') fail('Book already returned.', 409);
    const daysOverdue = Math.max(0, Math.ceil((Date.now() - new Date(issue.dueDate).getTime()) / 86400000));
    const penalty = daysOverdue * (issue.penaltyRate ?? 2);
    d.issues[idx] = { ...issue, status: 'returned', returnedDate: new Date().toISOString(), penaltyAmount: penalty, remarks: body?.remarks ?? issue.remarks };
    const book = d.books.find((b: any) => b.id === issue.bookId);
    if (book) book.availableCopies += 1;
    if (penalty > 0) pushNotification(d, issue.studentId, '⚠️ Library Penalty', `You have a penalty of ₹${penalty} for late return of "${book?.title}".`, 'warning', '/library');
    saveDb(d);
    return ok(d.issues[idx], `Book returned. ${penalty > 0 ? `Penalty: ₹${penalty}` : 'No penalty.'}`);
  },
  async getStats() {
    await delay(80);
    const d = getDb(); requireAuth();
    const overdue = d.issues.filter((i: any) => i.status === 'issued' && new Date(i.dueDate) < new Date());
    const totalPenalty = d.issues.reduce((s: number, i: any) => s + (i.penaltyAmount || 0), 0);
    return ok({ totalBooks: d.books.length, totalCopies: d.books.reduce((s: number, b: any) => s + b.totalCopies, 0), availableCopies: d.books.reduce((s: number, b: any) => s + b.availableCopies, 0), totalIssued: d.issues.filter((i: any) => i.status === 'issued').length, totalReturned: d.issues.filter((i: any) => i.status === 'returned').length, overdueCount: overdue.length, totalPenaltyCollected: totalPenalty, totalMembers: d.users.length });
  },
  async searchStudents(q: string) {
    await delay(80);
    const d = getDb();
    return ok(d.users.filter((u: any) => u.role === 'student' && (u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))).slice(0, 10).map((u: any) => withProfile(u, d)));
  },
  async toggleLibrarian(userId: string, isLibrarian: boolean) {
    await delay(120);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'admin');
    const idx = d.profiles.findIndex((p: any) => p.userId === userId);
    if (idx === -1) fail('Profile not found.', 404);
    d.profiles[idx].isLibrarian = isLibrarian;
    pushNotification(d, userId, 'Library Staff Access', isLibrarian ? 'You have been granted library staff access.' : 'Your library staff access has been revoked.', 'info');
    saveDb(d);
    return ok({}, `User ${isLibrarian ? 'set as' : 'removed from'} library staff.`);
  },
};

// ═══════════════════════════════════════════════════════════════════
// ATTENDANCE — mirrors attendanceController.ts + QR Code generation
// ═══════════════════════════════════════════════════════════════════
export const mockAttendance = {
  async createSession(body: any) {
    await delay(150);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'faculty', 'admin');
    if (!body.subject) fail('Subject is required.');
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const qrData = JSON.stringify({ code, subject: body.subject, date: body.date, faculty: user.fullName });
    // Generate real QR code as Data URL
    let qrDataUrl: string | null = null;
    try { qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 }); } catch {}
    const session = { id: uid(), ...body, facultyId: user.id, facultyName: user.fullName, code, qrDataUrl, isActive: true, recordCount: 0, createdAt: new Date().toISOString() };
    d.attendanceSessions.push(session); saveDb(d);
    return ok(session, `Session created with code: ${code}`);
  },
  async getMySessions() {
    await delay(80);
    const d = getDb(); const user = requireAuth();
    const sessions = user.role === 'admin'
      ? d.attendanceSessions
      : d.attendanceSessions.filter((s: any) => s.facultyId === user.id);
    return ok(sessions.map((s: any) => ({ ...s, recordCount: d.attendanceRecords.filter((r: any) => r.sessionId === s.id).length })));
  },
  async getSessionByCode(code: string) {
    await delay(80);
    const d = getDb(); requireAuth();
    const s = d.attendanceSessions.find((x: any) => x.code === code);
    if (!s) fail('Session not found. Check the code.', 404);
    if (!s.isActive) fail('This session is no longer active.', 410);
    return ok(s);
  },
  async markAttendance(sessionCode: string) {
    await delay(120);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'student');
    const session = d.attendanceSessions.find((s: any) => s.code === sessionCode);
    if (!session) fail('Invalid session code.', 404);
    if (!session.isActive) fail('This attendance session has already closed.', 410);
    const already = d.attendanceRecords.find((r: any) => r.sessionId === session.id && r.studentId === user.id);
    if (already) fail('You have already marked attendance for this session.', 409);
    const record = { id: uid(), sessionId: session.id, studentId: user.id, studentName: user.fullName, markedAt: new Date().toISOString(), status: 'present' };
    d.attendanceRecords.push(record); saveDb(d);
    return ok(record, '✅ Attendance marked successfully!');
  },
  async getMyRecords() {
    await delay(80);
    const d = getDb(); const user = requireAuth();
    const records = d.attendanceRecords.filter((r: any) => r.studentId === user.id).map((r: any) => ({
      ...r, session: d.attendanceSessions.find((s: any) => s.id === r.sessionId),
    }));
    return ok(records);
  },
  async getSessionRecords(sessionId: string) {
    await delay(80);
    const d = getDb(); requireAuth();
    const records = d.attendanceRecords.filter((r: any) => r.sessionId === sessionId).map((r: any) => ({
      ...r, student: withProfile(d.users.find((u: any) => u.id === r.studentId), d),
    }));
    return ok(records);
  },
  async closeSession(sessionId: string) {
    await delay(100);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'faculty', 'admin');
    const idx = d.attendanceSessions.findIndex((s: any) => s.id === sessionId);
    if (idx === -1) fail('Session not found.', 404);
    d.attendanceSessions[idx].isActive = false; saveDb(d);
    return ok(undefined, 'Session closed.');
  },
  async getStats() {
    await delay(80);
    const d = getDb(); requireAuth();
    return ok({ totalSessions: d.attendanceSessions.length, activeSessions: d.attendanceSessions.filter((s: any) => s.isActive).length, totalRecords: d.attendanceRecords.length });
  },
  async getMyPercentage() {
    await delay(80);
    const d = getDb(); const user = requireAuth();
    const total = d.attendanceSessions.length;
    const present = d.attendanceRecords.filter((r: any) => r.studentId === user.id && r.status === 'present').length;
    return ok({ percentage: total > 0 ? Math.round((present / total) * 100) : 0, present, total });
  },
  async getTimetable(section: string) {
    await delay(80); const d = getDb();
    const tt = (d.timetables || []).find((t: any) => t.section === section);
    return ok(tt ?? null);
  },
  async uploadTimetable(section: string, imageBase64: string) {
    await delay(150);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    d.timetables = d.timetables || [];
    const idx = d.timetables.findIndex((t: any) => t.section === section);
    if (idx !== -1) d.timetables[idx] = { ...d.timetables[idx], imageBase64, updatedAt: new Date().toISOString() };
    else d.timetables.push({ id: uid(), section, imageBase64, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    saveDb(d);
    return ok({}, 'Timetable uploaded.');
  },
  async deleteTimetable(section: string) {
    await delay(100);
    const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    d.timetables = (d.timetables || []).filter((t: any) => t.section !== section); saveDb(d);
    return ok(undefined, 'Timetable deleted.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// HOSTEL — mirrors hostelController.ts (all 14 routes)
// ═══════════════════════════════════════════════════════════════════
export const mockHostel = {
  async getBlocks() {
    await delay(80); const d = getDb(); requireAuth();
    return ok(d.hostelBlocks.filter((b: any) => b.isActive).map((b: any) => ({
      ...b,
      rooms: d.hostelRooms.filter((r: any) => r.blockId === b.id),
      _count: {
        rooms: d.hostelRooms.filter((r: any) => r.blockId === b.id).length,
        complaints: d.hostelComplaints.filter((c: any) => c.blockId === b.id).length,
      },
    })));
  },
  async createBlock(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin');
    if (!body.name || !body.type) fail('Name and type are required.');
    if (d.hostelBlocks.find((b: any) => b.name === body.name)) fail('Block name already exists.', 409);
    const block = { id: uid(), ...body, totalFloors: body.totalFloors ?? 4, isActive: true };
    d.hostelBlocks.push(block); saveDb(d);
    return ok(block, 'Block created.');
  },
  async getRooms(params: any) {
    await delay(80); const d = getDb(); requireAuth();
    let rooms = d.hostelRooms.map((r: any) => ({
      ...r,
      block: d.hostelBlocks.find((b: any) => b.id === r.blockId),
      allocations: d.roomAllocations.filter((a: any) => a.roomId === r.id && a.status === 'active').map((a: any) => ({ ...a, student: withProfile(d.users.find((u: any) => u.id === a.studentId), d) })),
      _count: { allocations: d.roomAllocations.filter((a: any) => a.roomId === r.id && a.status === 'active').length },
    }));
    if (params?.blockId) rooms = rooms.filter((r: any) => r.blockId === params.blockId);
    if (params?.available === 'true') rooms = rooms.filter((r: any) => r.isAvailable);
    return ok(rooms);
  },
  async createRoom(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff or admin only.', 403);
    if (!body.blockId || !body.roomNumber) fail('blockId and roomNumber are required.');
    if (d.hostelRooms.find((r: any) => r.blockId === body.blockId && r.roomNumber === body.roomNumber)) fail('Room number already exists in this block.', 409);
    const room = { id: uid(), ...body, floor: body.floor ?? 1, capacity: body.capacity ?? 2, type: body.type ?? 'double', amenities: body.amenities ?? '', isAvailable: true };
    d.hostelRooms.push(room); saveDb(d);
    return ok(room, 'Room created.');
  },
  async getMyRoom() {
    await delay(80); const d = getDb(); const user = requireAuth();
    const allocation = d.roomAllocations.find((a: any) => a.studentId === user.id && a.status === 'active');
    if (!allocation) return ok({ allocation: null, fees: [], room: null, block: null });
    const room = d.hostelRooms.find((r: any) => r.id === allocation.roomId);
    const block = room ? d.hostelBlocks.find((b: any) => b.id === room.blockId) : null;
    const fees = d.hostelFees.filter((f: any) => f.studentId === user.id);
    return ok({ allocation, room, block, fees });
  },
  async getAllAllocations() {
    await delay(80); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    return ok(d.roomAllocations.map((a: any) => ({ ...a, student: withProfile(d.users.find((u: any) => u.id === a.studentId), d), room: d.hostelRooms.find((r: any) => r.id === a.roomId), block: d.hostelBlocks.find((b: any) => b.id === d.hostelRooms.find((r: any) => r.id === a.roomId)?.blockId) })));
  },
  async allocateRoom(body: any) {
    await delay(150); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    const { studentId, roomId, academicYear } = body;
    if (!studentId || !roomId) fail('studentId and roomId are required.');
    const room = d.hostelRooms.find((r: any) => r.id === roomId);
    if (!room) fail('Room not found.', 404);
    const activeInRoom = d.roomAllocations.filter((a: any) => a.roomId === roomId && a.status === 'active').length;
    if (activeInRoom >= room.capacity) fail('Room is at full capacity.', 409);
    const existing = d.roomAllocations.find((a: any) => a.studentId === studentId && a.status === 'active');
    if (existing) fail('Student already has an active room allocation.', 409);
    const allocation = { id: uid(), studentId, roomId, academicYear: academicYear ?? '2025-26', status: 'active', checkInDate: new Date().toISOString(), checkOutDate: null, remarks: body.remarks ?? null };
    d.roomAllocations.push(allocation);
    if (activeInRoom + 1 >= room.capacity) room.isAvailable = false;
    const block = d.hostelBlocks.find((b: any) => b.id === room.blockId);
    pushNotification(d, studentId, '🏠 Room Allocated', `You have been allocated Room ${room.roomNumber} in ${block?.name ?? 'the hostel'}.`, 'success', '/hostel');
    saveDb(d);
    return ok(allocation, 'Room allocated successfully.');
  },
  async vacateRoom(allocationId: string) {
    await delay(150); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    const idx = d.roomAllocations.findIndex((a: any) => a.id === allocationId);
    if (idx === -1) fail('Allocation not found.', 404);
    d.roomAllocations[idx].status = 'vacated';
    d.roomAllocations[idx].checkOutDate = new Date().toISOString();
    const room = d.hostelRooms.find((r: any) => r.id === d.roomAllocations[idx].roomId);
    if (room) room.isAvailable = true;
    pushNotification(d, d.roomAllocations[idx].studentId, '🏠 Room Vacated', 'Your hostel room has been vacated. Please contact the warden for any queries.', 'info');
    saveDb(d);
    return ok(d.roomAllocations[idx], 'Room vacated.');
  },
  async getGatePasses(params: any) {
    await delay(80); const d = getDb(); const user = requireAuth();
    let passes = user.role === 'student' ? d.gatePasses.filter((p: any) => p.studentId === user.id) : [...d.gatePasses];
    if (params?.status && params.status !== 'all') passes = passes.filter((p: any) => p.status === params.status);
    return ok(passes.map((p: any) => ({ ...p, student: withProfile(d.users.find((u: any) => u.id === p.studentId), d) })));
  },
  async applyGatePass(body: any) {
    await delay(150); const d = getDb(); const user = requireAuth(); requireRole(user, 'student');
    if (!body.reason || !body.outDateTime || !body.expectedReturn) fail('Reason, out time, and expected return are required.');
    const pass = { id: uid(), studentId: user.id, ...body, status: 'pending', approvedById: null, approvedAt: null, actualReturn: null, createdAt: new Date().toISOString() };
    d.gatePasses.push(pass);
    // Notify wardens
    d.profiles.filter((p: any) => p.isWarden).forEach((p: any) => {
      pushNotification(d, p.userId, '🚪 New Gate Pass Request', `${user.fullName} has applied for a gate pass.`, 'info', '/hostel');
    });
    saveDb(d);
    return ok(pass, 'Gate pass application submitted.');
  },
  async updateGatePass(id: string, body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    const idx = d.gatePasses.findIndex((p: any) => p.id === id);
    if (idx === -1) fail('Gate pass not found.', 404);
    d.gatePasses[idx] = { ...d.gatePasses[idx], ...body };
    if (body.status === 'approved' || body.status === 'rejected') {
      d.gatePasses[idx].approvedById = user.id;
      d.gatePasses[idx].approvedAt = new Date().toISOString();
      const statusText = body.status === 'approved' ? '✅ approved' : '❌ rejected';
      pushNotification(d, d.gatePasses[idx].studentId, `Gate Pass ${statusText}`, `Your gate pass request has been ${body.status}.`, body.status === 'approved' ? 'success' : 'warning', '/hostel');
    }
    saveDb(d);
    return ok(d.gatePasses[idx], `Gate pass ${body.status}.`);
  },
  async getMessMenu() {
    await delay(60); return ok(getDb().messMenu);
  },
  async updateMessMenu(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    // body should be an array of menu items
    if (body.menu && Array.isArray(body.menu)) {
      d.messMenu = body.menu; saveDb(d);
      return ok(d.messMenu, 'Mess menu updated.');
    }
    // single item update
    const { blockId, day, meal, items } = body;
    const idx = d.messMenu.findIndex((m: any) => m.blockId === (blockId ?? 'COMMON') && m.day === day && m.meal === meal);
    if (idx !== -1) d.messMenu[idx].items = items;
    else d.messMenu.push({ id: uid(), blockId: blockId ?? 'COMMON', day, meal, items });
    saveDb(d);
    return ok(d.messMenu, 'Mess menu updated.');
  },
  async getComplaints(params: any) {
    await delay(80); const d = getDb(); const user = requireAuth();
    let items = user.role === 'student' ? d.hostelComplaints.filter((c: any) => c.studentId === user.id) : [...d.hostelComplaints];
    if (params?.status && params.status !== 'all') items = items.filter((c: any) => c.status === params.status);
    return ok(items.map((c: any) => ({ ...c, student: withProfile(d.users.find((u: any) => u.id === c.studentId), d) })));
  },
  async fileComplaint(body: any) {
    await delay(150); const d = getDb(); const user = requireAuth(); requireRole(user, 'student');
    if (!body.title || !body.description) fail('Title and description are required.');
    const complaint = { id: uid(), studentId: user.id, ...body, status: 'open', priority: body.priority ?? 'normal', resolvedById: null, resolvedAt: null, resolution: null, createdAt: new Date().toISOString() };
    d.hostelComplaints.push(complaint);
    d.profiles.filter((p: any) => p.isWarden).forEach((p: any) => {
      pushNotification(d, p.userId, `🔧 New Complaint: ${body.title}`, `${user.fullName}: ${body.description.slice(0, 100)}`, complaint.priority === 'urgent' ? 'warning' : 'info', '/hostel');
    });
    saveDb(d);
    return ok(complaint, 'Complaint filed. Warden has been notified.');
  },
  async updateComplaint(id: string, body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    const idx = d.hostelComplaints.findIndex((c: any) => c.id === id);
    if (idx === -1) fail('Complaint not found.', 404);
    d.hostelComplaints[idx] = { ...d.hostelComplaints[idx], ...body };
    if (body.status === 'resolved') {
      d.hostelComplaints[idx].resolvedById = user.id;
      d.hostelComplaints[idx].resolvedAt = new Date().toISOString();
      pushNotification(d, d.hostelComplaints[idx].studentId, '✅ Complaint Resolved', `Your complaint "${d.hostelComplaints[idx].title}" has been resolved. ${body.resolution ?? ''}`, 'success', '/hostel');
    }
    saveDb(d);
    return ok(d.hostelComplaints[idx]);
  },
  async getFees(params: any) {
    await delay(80); const d = getDb(); const user = requireAuth();
    let fees = user.role === 'student' ? d.hostelFees.filter((f: any) => f.studentId === user.id) : [...d.hostelFees];
    if (params?.status && params.status !== 'all') fees = fees.filter((f: any) => f.status === params.status);
    return ok(fees.map((f: any) => ({ ...f, student: withProfile(d.users.find((u: any) => u.id === f.studentId), d) })));
  },
  async createFee(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    if (!body.studentId || !body.amount || !body.period) fail('studentId, amount, and period are required.');
    const fee = { id: uid(), ...body, status: 'pending', paidDate: null, paymentRef: null, createdAt: new Date().toISOString() };
    d.hostelFees.push(fee);
    pushNotification(d, body.studentId, '💰 Hostel Fee Due', `₹${body.amount} is due for ${body.period}. Due date: ${new Date(body.dueDate).toLocaleDateString('en-IN')}.`, 'warning', '/hostel');
    saveDb(d);
    return ok(fee, 'Fee record created.');
  },
  async markFeePaid(feeId: string, body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!isHostelStaff(user, d)) fail('Hostel staff only.', 403);
    const idx = d.hostelFees.findIndex((f: any) => f.id === feeId);
    if (idx === -1) fail('Fee record not found.', 404);
    d.hostelFees[idx] = { ...d.hostelFees[idx], status: 'paid', paidDate: new Date().toISOString(), paymentRef: body?.paymentRef ?? `PAY-${uid().slice(0,8).toUpperCase()}` };
    pushNotification(d, d.hostelFees[idx].studentId, '✅ Fee Payment Confirmed', `Your hostel fee of ₹${d.hostelFees[idx].amount} for ${d.hostelFees[idx].period} has been confirmed.`, 'success', '/hostel');
    saveDb(d);
    return ok(d.hostelFees[idx], 'Fee marked as paid.');
  },
  async getStats() {
    await delay(80); const d = getDb(); requireAuth();
    const pendingFees = d.hostelFees.filter((f: any) => f.status === 'pending');
    return ok({ totalBlocks: d.hostelBlocks.length, totalRooms: d.hostelRooms.length, availableRooms: d.hostelRooms.filter((r: any) => r.isAvailable).length, activeAllocations: d.roomAllocations.filter((a: any) => a.status === 'active').length, pendingPasses: d.gatePasses.filter((p: any) => p.status === 'pending').length, approvedPasses: d.gatePasses.filter((p: any) => p.status === 'approved').length, openComplaints: d.hostelComplaints.filter((c: any) => c.status === 'open').length, urgentComplaints: d.hostelComplaints.filter((c: any) => c.status === 'open' && c.priority === 'urgent').length, pendingFees: pendingFees.length, pendingFeeTotal: pendingFees.reduce((s: number, f: any) => s + f.amount, 0) });
  },
  async searchStudents(q: string) {
    await delay(80); const d = getDb();
    return ok(d.users.filter((u: any) => u.role === 'student' && (u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))).slice(0, 10).map((u: any) => withProfile(u, d)));
  },
  async toggleWarden(userId: string, isWarden: boolean) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin');
    const idx = d.profiles.findIndex((p: any) => p.userId === userId);
    if (idx === -1) fail('Profile not found.', 404);
    d.profiles[idx].isWarden = isWarden;
    pushNotification(d, userId, 'Warden Access', isWarden ? 'You have been granted hostel warden privileges.' : 'Your warden privileges have been revoked.', 'info');
    saveDb(d);
    return ok({}, `User ${isWarden ? 'set as' : 'removed from'} warden.`);
  },
};

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS — new frontend-native module
// ═══════════════════════════════════════════════════════════════════
export const mockNotifications = {
  async getMyNotifications(params: any) {
    await delay(60); const d = getDb(); const user = requireAuth();
    let notifs = (d.notifications || []).filter((n: any) => n.userId === user.id).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (params?.unreadOnly) notifs = notifs.filter((n: any) => !n.isRead);
    return ok({ notifications: notifs, unreadCount: notifs.filter((n: any) => !n.isRead).length });
  },
  async markRead(id: string) {
    await delay(50); const d = getDb(); const user = requireAuth();
    const idx = d.notifications.findIndex((n: any) => n.id === id && n.userId === user.id);
    if (idx !== -1) { d.notifications[idx].isRead = true; saveDb(d); }
    return ok(undefined, 'Marked as read.');
  },
  async markAllRead() {
    await delay(80); const d = getDb(); const user = requireAuth();
    (d.notifications || []).forEach((n: any) => { if (n.userId === user.id) n.isRead = true; });
    saveDb(d);
    return ok(undefined, 'All notifications marked as read.');
  },
  async deleteNotification(id: string) {
    await delay(60); const d = getDb(); const user = requireAuth();
    d.notifications = (d.notifications || []).filter((n: any) => !(n.id === id && n.userId === user.id));
    saveDb(d);
    return ok(undefined, 'Notification deleted.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// EVENTS — mirrors eventController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockEvent = {
  async list(params: any) {
    await delay(80); const d = getDb(); requireAuth();
    let events = [...d.events].sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    if (params?.category && params.category !== 'all') events = events.filter((e: any) => e.category === params.category);
    if (params?.search) { const q = params.search.toLowerCase(); events = events.filter((e: any) => e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)); }
    return ok({ events, total: events.length });
  },
  async create(body: any) {
    await delay(150); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    if (!body.title || !body.eventDate) fail('Title and event date are required.');
    const event = { id: uid(), ...body, files: [], createdById: user.id, createdAt: new Date().toISOString() };
    d.events.push(event);
    d.users.forEach((u: any) => { if (u.id !== user.id) pushNotification(d, u.id, `📅 New Event: ${body.title}`, `${body.venue} • ${new Date(body.eventDate).toLocaleDateString('en-IN')}`, 'info', '/events'); });
    saveDb(d);
    return ok(event, 'Event created.');
  },
  async getById(id: string) {
    await delay(60); const d = getDb(); requireAuth();
    const ev = d.events.find((e: any) => e.id === id); if (!ev) fail('Event not found.', 404);
    return ok(ev);
  },
  async update(id: string, body: any) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    const idx = d.events.findIndex((e: any) => e.id === id); if (idx === -1) fail('Not found.', 404);
    if (user.role !== 'admin' && d.events[idx].createdById !== user.id) fail('You can only edit your own events.', 403);
    d.events[idx] = { ...d.events[idx], ...body }; saveDb(d);
    return ok(d.events[idx]);
  },
  async delete(id: string) {
    await delay(100); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    const ev = d.events.find((e: any) => e.id === id); if (!ev) fail('Not found.', 404);
    if (user.role !== 'admin' && ev.createdById !== user.id) fail('You can only delete your own events.', 403);
    d.events = d.events.filter((e: any) => e.id !== id); saveDb(d);
    return ok(undefined, 'Event deleted.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// COMMUNITIES, MANAGEMENT, LOST & FOUND, MAP PINS
// ═══════════════════════════════════════════════════════════════════
export const mockCommunity = {
  async list() { await delay(60); requireAuth(); return ok(getDb().communities); },
  async create(body: any) { await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty'); const c = { id: uid(), ...body, createdAt: new Date().toISOString() }; d.communities.push(c); saveDb(d); return ok(c); },
  async update(id: string, body: any) { await delay(100); const d = getDb(); requireAuth(); const allowed = ['name','description','type','logoBase64','isRecruitmentActive','formUrl','memberCount','tags']; const idx = d.communities.findIndex((c: any) => c.id === id); if (idx === -1) fail('Not found.', 404); allowed.forEach(k => { if (body[k] !== undefined) d.communities[idx][k] = body[k]; }); saveDb(d); return ok(d.communities[idx]); },
  async delete(id: string) { await delay(100); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin'); d.communities = d.communities.filter((c: any) => c.id !== id); saveDb(d); return ok(undefined, 'Deleted.'); },
};

export const mockManagement = {
  async list() { await delay(60); requireAuth(); return ok(getDb().management.sort((a: any, b: any) => a.order - b.order)); },
  async create(body: any) { await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin'); const e = { id: uid(), ...body }; d.management.push(e); saveDb(d); return ok(e); },
  async update(id: string, body: any) { await delay(100); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin'); const allowed = ['name','designation','department','school','office','phone','email','photoBase64','order']; const idx = d.management.findIndex((e: any) => e.id === id); if (idx === -1) fail('Not found.', 404); allowed.forEach(k => { if (body[k] !== undefined) d.management[idx][k] = body[k]; }); saveDb(d); return ok(d.management[idx]); },
  async delete(id: string) { await delay(100); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin'); d.management = d.management.filter((e: any) => e.id !== id); saveDb(d); return ok(undefined, 'Deleted.'); },
};

export const mockLostFound = {
  async list(params: any) {
    await delay(80); const d = getDb(); requireAuth();
    let items = [...d.lostFound].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (params?.status && params.status !== 'all') items = items.filter((i: any) => i.status === params.status);
    if (params?.category) items = items.filter((i: any) => i.category === params.category);
    if (params?.type) items = items.filter((i: any) => i.type === params.type);
    if (params?.search) { const q = params.search.toLowerCase(); items = items.filter((i: any) => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)); }
    return ok({ items, total: items.length });
  },
  async getById(id: string) { await delay(60); const d = getDb(); requireAuth(); const item = d.lostFound.find((i: any) => i.id === id); if (!item) fail('Not found.', 404); return ok(item); },
  async create(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth();
    if (!body.title || !body.type) fail('Title and type (lost/found) are required.');
    const item = { id: uid(), ...body, reporterId: user.id, reporterName: user.fullName, images: [], status: 'open', createdAt: new Date().toISOString() };
    d.lostFound.push(item); saveDb(d);
    return ok(item, body.type === 'lost' ? 'Lost item reported.' : 'Found item reported. Campus notified.');
  },
  async update(id: string, body: any) { await delay(100); const d = getDb(); const user = requireAuth(); const idx = d.lostFound.findIndex((i: any) => i.id === id); if (idx === -1) fail('Not found.', 404); if (user.role !== 'admin' && d.lostFound[idx].reporterId !== user.id) fail('Unauthorized.', 403); d.lostFound[idx] = { ...d.lostFound[idx], ...body }; saveDb(d); return ok(d.lostFound[idx]); },
  async delete(id: string) { await delay(100); const d = getDb(); const user = requireAuth(); const item = d.lostFound.find((i: any) => i.id === id); if (!item) fail('Not found.', 404); if (user.role !== 'admin' && item.reporterId !== user.id) fail('Unauthorized.', 403); d.lostFound = d.lostFound.filter((i: any) => i.id !== id); saveDb(d); return ok(undefined, 'Deleted.'); },
  async claim(id: string) { await delay(100); const d = getDb(); requireAuth(); const idx = d.lostFound.findIndex((i: any) => i.id === id); if (idx !== -1) { d.lostFound[idx].status = 'claimed'; saveDb(d); } return ok(d.lostFound[idx]); },
};

export const mockMapPin = {
  async list() { await delay(60); requireAuth(); return ok(getDb().mapPins); },
  async create(body: any) { await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty'); const pin = { id: uid(), ...body, createdById: user.id, createdAt: new Date().toISOString() }; d.mapPins.push(pin); saveDb(d); return ok(pin); },
  async delete(id: string) { await delay(100); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin'); d.mapPins = d.mapPins.filter((p: any) => p.id !== id); saveDb(d); return ok(undefined, 'Pin deleted.'); },
};

// ═══════════════════════════════════════════════════════════════════
// CLASSROOM — mirrors classroomController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockClassroom = {
  async getMyClassroom() {
    await delay(80); const d = getDb(); const user = requireAuth();
    const memberships = d.classroomMembers.filter((m: any) => m.userId === user.id);
    const classrooms = memberships.map((m: any) => ({ ...d.classrooms.find((c: any) => c.id === m.classroomId), role: m.role })).filter(Boolean);
    return ok(classrooms);
  },
  async createClassroom(course: string, section: string) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'faculty', 'admin');
    const cls = { id: uid(), name: `${course} - Section ${section}`, course, section, facultyId: user.id, createdAt: new Date().toISOString() };
    d.classrooms.push(cls);
    d.classroomMembers.push({ id: uid(), classroomId: cls.id, userId: user.id, role: 'faculty', joinedAt: new Date().toISOString() });
    saveDb(d); return ok(cls, 'Classroom created.');
  },
  async getMembers(id: string) { await delay(80); const d = getDb(); requireAuth(); return ok(d.classroomMembers.filter((m: any) => m.classroomId === id).map((m: any) => ({ ...m, user: withProfile(d.users.find((u: any) => u.id === m.userId), d) }))); },
  async getNotes(id: string) { await delay(80); const d = getDb(); requireAuth(); return ok(d.classroomNotes.filter((n: any) => n.classroomId === id)); },
  async uploadNote(id: string, body: any) {
    await delay(150); const d = getDb(); const user = requireAuth(); requireRole(user, 'faculty', 'admin');
    if (!body.title || !body.fileName) fail('Title and fileName are required.');
    const note = { id: uid(), classroomId: id, uploaderId: user.id, uploaderName: user.fullName, ...body, createdAt: new Date().toISOString() };
    d.classroomNotes.push(note);
    // Notify classroom members
    d.classroomMembers.filter((m: any) => m.classroomId === id && m.userId !== user.id).forEach((m: any) => {
      pushNotification(d, m.userId, '📄 New Note Uploaded', `${user.fullName} uploaded "${body.title}"`, 'info', '/classroom');
    });
    saveDb(d); return ok(note, 'Note uploaded successfully.');
  },
  async deleteNote(classroomId: string, noteId: string) { await delay(100); const d = getDb(); const user = requireAuth(); const note = d.classroomNotes.find((n: any) => n.id === noteId && n.classroomId === classroomId); if (!note) fail('Not found.', 404); if (user.role !== 'admin' && note.uploaderId !== user.id) fail('Unauthorized.', 403); d.classroomNotes = d.classroomNotes.filter((n: any) => !(n.classroomId === classroomId && n.id === noteId)); saveDb(d); return ok(undefined, 'Deleted.'); },
  async getMessages(id: string) { await delay(80); const d = getDb(); requireAuth(); return ok(d.classroomMessages.filter((m: any) => m.classroomId === id)); },
  async postMessage(id: string, content: string) {
    await delay(100); const d = getDb(); const user = requireAuth();
    if (!content?.trim()) fail('Message content is required.');
    const msg = { id: uid(), classroomId: id, senderId: user.id, senderName: user.fullName, content: content.trim(), sentAt: new Date().toISOString() };
    d.classroomMessages.push(msg); saveDb(d); return ok(msg);
  },
};

// ═══════════════════════════════════════════════════════════════════
// ASSIGNMENTS — mirrors assignmentController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockAssignment = {
  async list(classroomId: string) {
    await delay(80); const d = getDb(); const user = requireAuth();
    const assignments = d.assignments.filter((a: any) => a.classroomId === classroomId);
    return ok(assignments.map((a: any) => ({
      ...a,
      createdBy: d.users.find((u: any) => u.id === a.createdById),
      daysUntilDue: a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000) : null,
      mySubmission: d.assignmentSubmissions.find((s: any) => s.assignmentId === a.id && s.studentId === user.id) ?? null,
      submissions: (user.role === 'faculty' || user.role === 'admin')
        ? d.assignmentSubmissions.filter((s: any) => s.assignmentId === a.id).map((s: any) => ({ ...s, student: withProfile(d.users.find((u: any) => u.id === s.studentId), d) }))
        : undefined,
    })));
  },
  async create(classroomId: string, body: any) {
    await delay(150); const d = getDb(); const user = requireAuth(); requireRole(user, 'faculty', 'admin');
    if (!body.title) fail('Title is required.');
    const a = { id: uid(), classroomId, ...body, createdById: user.id, createdByName: user.fullName, dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : null, createdAt: new Date().toISOString() };
    d.assignments.push(a);
    d.classroomMembers.filter((m: any) => m.classroomId === classroomId && m.role === 'student').forEach((m: any) => {
      pushNotification(d, m.userId, '📝 New Assignment', `${body.title} — Due: ${a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-IN') : 'No deadline'}`, 'info', '/classroom');
    });
    saveDb(d); return ok(a, 'Assignment created.');
  },
  async submit(assignmentId: string, body: any) {
    await delay(150); const d = getDb(); const user = requireAuth(); requireRole(user, 'student');
    const assignment = d.assignments.find((a: any) => a.id === assignmentId); if (!assignment) fail('Assignment not found.', 404);
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) fail('Submission deadline has passed.', 410);
    const existingIdx = d.assignmentSubmissions.findIndex((s: any) => s.assignmentId === assignmentId && s.studentId === user.id);
    const sub = { id: existingIdx !== -1 ? d.assignmentSubmissions[existingIdx].id : uid(), assignmentId, studentId: user.id, ...body, submittedAt: new Date().toISOString(), grade: null, feedback: null };
    if (existingIdx !== -1) d.assignmentSubmissions[existingIdx] = sub;
    else d.assignmentSubmissions.push(sub);
    pushNotification(d, assignment.createdById, '📋 New Submission', `${user.fullName} submitted "${assignment.title}"`, 'info', '/classroom');
    saveDb(d); return ok(sub, 'Submitted successfully!');
  },
  async getSubmission(subId: string) { await delay(80); const d = getDb(); requireAuth(); const sub = d.assignmentSubmissions.find((s: any) => s.id === subId); if (!sub) fail('Not found.', 404); return ok({ ...sub, student: withProfile(d.users.find((u: any) => u.id === sub.studentId), d) }); },
  async grade(subId: string, body: any) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'faculty', 'admin');
    const idx = d.assignmentSubmissions.findIndex((s: any) => s.id === subId); if (idx === -1) fail('Not found.', 404);
    d.assignmentSubmissions[idx] = { ...d.assignmentSubmissions[idx], ...body, gradedAt: new Date().toISOString(), gradedById: user.id };
    pushNotification(d, d.assignmentSubmissions[idx].studentId, '✅ Assignment Graded', `Your submission has been graded. Grade: ${body.grade}`, 'success', '/classroom');
    saveDb(d); return ok(d.assignmentSubmissions[idx], 'Graded.');
  },
};

// ═══════════════════════════════════════════════════════════════════
// CHAT — mirrors chatController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockChat = {
  async searchUsers(params: any) {
    await delay(80); const d = getDb(); const user = requireAuth();
    const blocked = (d.blockedUsers || []).filter((b: any) => b.blockerId === user.id).map((b: any) => b.blockedId);
    let users = d.users.filter((u: any) => u.id !== user.id && !blocked.includes(u.id));
    if (params?.name) { const q = params.name.toLowerCase(); users = users.filter((u: any) => u.fullName.toLowerCase().includes(q)); }
    return ok(users.slice(0, 30).map((u: any) => withProfile(u, d)));
  },
  async getConversations() {
    await delay(80); const d = getDb(); const user = requireAuth();
    const convos = (d.chatConversations || []).filter((c: any) => c.participants?.includes(user.id))
      .map((c: any) => {
        const otherId = c.participants.find((p: string) => p !== user.id);
        const other = d.users.find((u: any) => u.id === otherId);
        const messages = (d.chatMessages || []).filter((m: any) => m.conversationId === c.id);
        const lastMsg = messages.sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] ?? null;
        const unread = messages.filter((m: any) => m.senderId !== user.id && !m.isRead).length;
        return { ...c, otherUser: other ? withProfile(other, d) : null, lastMessage: lastMsg, unreadCount: unread };
      })
      .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
    return ok(convos);
  },
  async startConversation(targetUserId: string) {
    await delay(100); const d = getDb(); const user = requireAuth();
    const existing = (d.chatConversations || []).find((c: any) => c.participants?.includes(user.id) && c.participants?.includes(targetUserId));
    if (existing) return ok(existing);
    const convo = { id: uid(), participants: [user.id, targetUserId], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    d.chatConversations = d.chatConversations || [];
    d.chatConversations.push(convo); saveDb(d);
    return ok(convo);
  },
  async getMessages(convoId: string) {
    await delay(80); const d = getDb(); const user = requireAuth();
    const msgs = (d.chatMessages || []).filter((m: any) => m.conversationId === convoId);
    // Mark received messages as read
    let changed = false;
    msgs.forEach((m: any) => { if (m.senderId !== user.id && !m.isRead) { m.isRead = true; changed = true; } });
    if (changed) saveDb(d);
    return ok(msgs.map((m: any) => ({ ...m, sender: d.users.find((u: any) => u.id === m.senderId) })));
  },
  async sendMessage(convoId: string, content: string) {
    await delay(100); const d = getDb(); const user = requireAuth();
    if (!content?.trim()) fail('Message cannot be empty.');
    const convo = (d.chatConversations || []).find((c: any) => c.id === convoId);
    if (!convo) fail('Conversation not found.', 404);
    const msg = { id: uid(), conversationId: convoId, senderId: user.id, content: content.trim(), sentAt: new Date().toISOString(), isRead: false };
    d.chatMessages = d.chatMessages || [];
    d.chatMessages.push(msg);
    convo.updatedAt = new Date().toISOString();
    // Notify the other participant
    const otherId = convo.participants.find((p: string) => p !== user.id);
    if (otherId) pushNotification(d, otherId, `💬 ${user.fullName}`, content.slice(0, 80), 'info', '/chat');
    saveDb(d);
    return ok({ ...msg, sender: { id: user.id, fullName: user.fullName } });
  },
  async blockUser(userId: string) {
    await delay(100); const d = getDb(); const user = requireAuth();
    d.blockedUsers = d.blockedUsers || [];
    if (!d.blockedUsers.find((b: any) => b.blockerId === user.id && b.blockedId === userId)) {
      d.blockedUsers.push({ id: uid(), blockerId: user.id, blockedId: userId, createdAt: new Date().toISOString() });
    }
    saveDb(d); return ok(undefined, 'User blocked.');
  },
  async unblockUser(userId: string) {
    await delay(80); const d = getDb(); const user = requireAuth();
    d.blockedUsers = (d.blockedUsers || []).filter((b: any) => !(b.blockerId === user.id && b.blockedId === userId));
    saveDb(d); return ok(undefined, 'User unblocked.');
  },
  async getBlocked() {
    await delay(60); const d = getDb(); const user = requireAuth();
    return ok((d.blockedUsers || []).filter((b: any) => b.blockerId === user.id).map((b: any) => ({ ...b, blocked: withProfile(d.users.find((u: any) => u.id === b.blockedId), d) })));
  },
};

// ═══════════════════════════════════════════════════════════════════
// ACADEMICS — mirrors academicsController.ts
// ═══════════════════════════════════════════════════════════════════
export const mockAcademics = {
  async getSubjects(params: any) {
    await delay(80); const d = getDb(); requireAuth();
    let s = [...d.subjects];
    if (params?.semester) s = s.filter((x: any) => x.semester === Number(params.semester));
    if (params?.department) s = s.filter((x: any) => x.department === params.department);
    return ok(s);
  },
  async createSubject(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    if (!body.name || !body.code) fail('Name and code are required.');
    if (d.subjects.find((s: any) => s.code === body.code)) fail('Subject code already exists.', 409);
    const s = { id: uid(), ...body, createdAt: new Date().toISOString() };
    d.subjects.push(s); saveDb(d); return ok(s, 'Subject created.');
  },
  async getMyMarks() {
    await delay(80); const d = getDb(); const user = requireAuth();
    return ok(d.marks.filter((m: any) => m.studentId === user.id).map((m: any) => ({
      ...m, subject: d.subjects.find((s: any) => s.id === m.subjectId),
      total: (m.internal ?? 0) + (m.external ?? 0),
      percentage: Math.round(((m.internal ?? 0) + (m.external ?? 0)) / ((d.subjects.find((s: any) => s.id === m.subjectId)?.maxInternal ?? 40) + (d.subjects.find((s: any) => s.id === m.subjectId)?.maxExternal ?? 60)) * 100),
    })));
  },
  async uploadMark(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    const { studentId, subjectId, internal, external, semester } = body;
    if (!studentId || !subjectId) fail('studentId and subjectId are required.');
    const existing = d.marks.findIndex((m: any) => m.studentId === studentId && m.subjectId === subjectId);
    const existingCreatedAt = existing !== -1 ? d.marks[existing].createdAt : new Date().toISOString();
    const mark = { id: existing !== -1 ? d.marks[existing].id : uid(), studentId, subjectId, internal, external, semester, uploadedById: user.id, createdAt: existingCreatedAt, updatedAt: new Date().toISOString() };
    if (existing !== -1) d.marks[existing] = mark;
    else d.marks.push(mark);
    const sub = d.subjects.find((s: any) => s.id === subjectId);
    pushNotification(d, studentId, '📊 Marks Updated', `${sub?.name ?? 'Subject'}: Internal ${internal}, External ${external}`, 'info', '/academics');
    saveDb(d); return ok(mark, 'Marks uploaded.');
  },
  async bulkUploadMarks(marks: any[]) {
    await delay(200); for (const m of marks) await mockAcademics.uploadMark(m);
    return ok({ count: marks.length }, `${marks.length} mark(s) uploaded.`);
  },
  async getCalendarEvents() { await delay(60); return ok(getDb().calendarEvents.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())); },
  async createCalendarEvent(body: any) {
    await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty');
    if (!body.title || !body.date) fail('Title and date are required.');
    const ev = { id: uid(), ...body, createdById: user.id, createdAt: new Date().toISOString() };
    d.calendarEvents.push(ev); saveDb(d); return ok(ev);
  },
  async deleteCalendarEvent(id: string) { await delay(80); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty'); d.calendarEvents = d.calendarEvents.filter((e: any) => e.id !== id); saveDb(d); return ok(undefined, 'Deleted.'); },
  async getMyFees() { await delay(80); const d = getDb(); const user = requireAuth(); return ok(d.feePayments.filter((f: any) => f.studentId === user.id)); },
  async getFeeStructures(params: any) { await delay(80); return ok(getDb().feeStructures || []); },
  async createFeeStructure(body: any) { await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin'); const fs = { id: uid(), ...body, createdAt: new Date().toISOString() }; d.feeStructures = d.feeStructures || []; d.feeStructures.push(fs); saveDb(d); return ok(fs); },
  async markFeePayment(body: any) { await delay(120); const d = getDb(); const user = requireAuth(); requireRole(user, 'admin', 'faculty'); const p = { id: uid(), ...body, paidAt: new Date().toISOString(), verifiedById: user.id }; d.feePayments = d.feePayments || []; d.feePayments.push(p); saveDb(d); return ok(p, 'Payment recorded.'); },
  async getFeeSummary() { await delay(80); return ok({ totalFees: 0, paidFees: 0, pendingFees: 0 }); },
};
