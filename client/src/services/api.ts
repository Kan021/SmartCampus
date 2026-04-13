import { isOffline } from './mode';
import {
  mockAuth, mockProfile, mockNotice, mockLibrary, mockEvent,
  mockHostel, mockCommunity, mockManagement, mockLostFound,
  mockMapPin, mockClassroom, mockAssignment, mockChat, mockAcademics, mockAttendance,
} from './mockApi';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken');

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Try to refresh token if expired
      if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('accessToken');
          config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` };
          const retryResponse = await fetch(`${API_URL}${endpoint}`, config);
          return retryResponse.json();
        }
      }
      throw data;
    }
    return data;
  } catch (err: any) {
    // Network error or backend unreachable — let callers handle with mock fallback
    if (err && err.success !== false) {
      // Real network error (not a structured API error)
      const e: any = new Error('Network error');
      e.networkError = true;
      throw e;
    }
    throw err;
  }
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (data.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Auth API Methods ────────────────────────────────────────
export const authApi = {
  register: (body: { email: string; password: string; role: string; fullName: string }) =>
    isOffline() ? mockAuth.register(body) : request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  verifyOtp: (body: { email: string; code: string; type: string }) =>
    isOffline() ? mockAuth.verifyOtp(body) : request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    isOffline() ? mockAuth.login(body) : request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (email: string) =>
    isOffline() ? mockAuth.forgotPassword({ email }) : request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    isOffline() ? mockAuth.resetPassword(body) : request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  resendOtp: (body: { email: string; type: string }) =>
    isOffline() ? mockAuth.resendOtp(body) : request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(body) }),

  me: () => isOffline() ? mockAuth.me() : request('/auth/me'),

  logout: () => { localStorage.removeItem('accessToken'); return isOffline() ? mockAuth.logout() : request('/auth/logout', { method: 'POST' }); },

  refresh: () => isOffline() ? mockAuth.refresh() : refreshToken(),
};

// ─── Profile API Methods ─────────────────────────────────────────
export const profileApi = {
  getMyProfile: () => isOffline() ? mockProfile.getMyProfile() : request('/profile/me'),
  updateMyProfile: (body: any) => isOffline() ? mockProfile.updateMyProfile(body) : request('/profile/me', { method: 'PUT', body: JSON.stringify(body) }),
  listUsers: (params?: any) => {
    if (isOffline()) return mockProfile.listUsers(params);
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.role) qs.set('role', params.role);
    if (params?.search) qs.set('search', params.search);
    if (params?.year) qs.set('year', String(params.year));
    if (params?.section) qs.set('section', params.section);
    if (params?.course) qs.set('course', params.course);
    return request(`/profile/users?${qs.toString()}`);
  },
  getUserById: (userId: string) => isOffline() ? mockProfile.getUserById(userId) : request(`/profile/${userId}`),
  updateUserRole: (userId: string, role: string) => isOffline() ? mockProfile.updateUserRole(userId, role) : request(`/profile/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  updateUserProfile: (userId: string, body: any) => isOffline() ? mockProfile.updateUserProfile(userId, body) : request(`/profile/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),
  bulkUpdateProfiles: (userIds: string[], updates: any) => isOffline() ? mockProfile.bulkUpdateProfiles(userIds, updates) : request('/profile/bulk-update', { method: 'POST', body: JSON.stringify({ userIds, updates }) }),
};

// ─── Attendance API Methods ──────────────────────────────────────
export const attendanceApi = {
  createSession: (body: any) => isOffline() ? mockAttendance.createSession(body) : request('/attendance/sessions', { method: 'POST', body: JSON.stringify(body) }),
  getMySessions: () => isOffline() ? mockAttendance.getMySessions() : request('/attendance/sessions'),
  getSessionByCode: (code: string) => isOffline() ? mockAttendance.getSessionByCode(code) : request(`/attendance/sessions/${code}`),
  markAttendance: (sessionCode: string) => isOffline() ? mockAttendance.markAttendance(sessionCode) : request('/attendance/mark', { method: 'POST', body: JSON.stringify({ sessionCode }) }),
  getMyRecords: () => isOffline() ? mockAttendance.getMyRecords() : request('/attendance/my-records'),
  getSessionRecords: (sessionId: string) => isOffline() ? mockAttendance.getSessionRecords(sessionId) : request(`/attendance/sessions/${sessionId}/records`),
  getStats: () => isOffline() ? mockAttendance.getStats() : request('/attendance/stats'),
  getMyPercentage: () => isOffline() ? mockAttendance.getMyPercentage() : request('/attendance/my-percentage'),
  getTimetable: (section: string) => isOffline() ? mockAttendance.getTimetable(section) : request(`/attendance/timetable/${section}`),
  uploadTimetable: (section: string, imageBase64: string) => isOffline() ? mockAttendance.uploadTimetable(section, imageBase64) : request('/attendance/timetable', { method: 'POST', body: JSON.stringify({ section, imageBase64 }) }),
  deleteTimetable: (section: string) => isOffline() ? mockAttendance.deleteTimetable(section) : request(`/attendance/timetable/${section}`, { method: 'DELETE' }),
};

// ─── Notice API Methods ──────────────────────────────────────────
export const noticeApi = {
  create: (body: any) => isOffline() ? mockNotice.create(body) : request('/notices', { method: 'POST', body: JSON.stringify(body) }),
  list: (params?: any) => {
    if (isOffline()) return mockNotice.list(params);
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.category) qs.set('category', params.category);
    return request(`/notices?${qs.toString()}`);
  },
  bulletin: () => isOffline() ? mockNotice.bulletin() : request('/notices/bulletin'),
  getById: (id: string) => isOffline() ? mockNotice.getById(id) : request(`/notices/${id}`),
  downloadPdf: (id: string) => request(`/notices/${id}/pdf`),
  delete: (id: string) => isOffline() ? mockNotice.delete(id) : request(`/notices/${id}`, { method: 'DELETE' }),
};

// ─── Academics API Methods ───────────────────────────────────────
export const academicsApi = {
  getSubjects: (params?: any) => {
    if (isOffline()) return mockAcademics.getSubjects(params);
    const qs = new URLSearchParams();
    if (params?.semester) qs.set('semester', String(params.semester));
    if (params?.department) qs.set('department', params.department);
    return request(`/academics/subjects?${qs.toString()}`);
  },
  createSubject: (body: any) => isOffline() ? mockAcademics.createSubject(body) : request('/academics/subjects', { method: 'POST', body: JSON.stringify(body) }),
  getMyMarks: () => isOffline() ? mockAcademics.getMyMarks() : request('/academics/marks/my'),
  uploadMark: (body: any) => isOffline() ? mockAcademics.uploadMark(body) : request('/academics/marks', { method: 'POST', body: JSON.stringify(body) }),
  bulkUploadMarks: (marks: any[]) => isOffline() ? mockAcademics.bulkUploadMarks(marks) : request('/academics/marks/bulk', { method: 'POST', body: JSON.stringify({ marks }) }),
  getFeeStructures: (params?: any) => isOffline() ? mockAcademics.getFeeStructures(params) : request('/academics/fees/structures'),
  createFeeStructure: (body: any) => isOffline() ? mockAcademics.createFeeStructure(body) : request('/academics/fees/structures', { method: 'POST', body: JSON.stringify(body) }),
  getMyFees: () => isOffline() ? mockAcademics.getMyFees() : request('/academics/fees/my'),
  markFeePayment: (body: any) => isOffline() ? mockAcademics.markFeePayment(body) : request('/academics/fees/pay', { method: 'POST', body: JSON.stringify(body) }),
  getFeeSummary: () => isOffline() ? mockAcademics.getFeeSummary() : request('/academics/fees/summary'),
  getCalendarEvents: () => isOffline() ? mockAcademics.getCalendarEvents() : request('/academics/calendar'),
  createCalendarEvent: (body: any) => isOffline() ? mockAcademics.createCalendarEvent(body) : request('/academics/calendar', { method: 'POST', body: JSON.stringify(body) }),
  deleteCalendarEvent: (id: string) => isOffline() ? mockAcademics.deleteCalendarEvent(id) : request(`/academics/calendar/${id}`, { method: 'DELETE' }),
};

// ─── Classroom API Methods ───────────────────────────────────────
export const classroomApi = {
  getMyClassroom: () => isOffline() ? mockClassroom.getMyClassroom() : request('/classroom/my'),
  createClassroom: (course: string, section: string) => isOffline() ? mockClassroom.createClassroom(course, section) : request('/classroom/create', { method: 'POST', body: JSON.stringify({ course, section }) }),
  getMembers: (id: string) => isOffline() ? mockClassroom.getMembers(id) : request(`/classroom/${id}/members`),
  getNotes: (id: string) => isOffline() ? mockClassroom.getNotes(id) : request(`/classroom/${id}/notes`),
  uploadNote: (id: string, body: any) => isOffline() ? mockClassroom.uploadNote(id, body) : request(`/classroom/${id}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  downloadNote: (id: string, noteId: string) => request(`/classroom/${id}/notes/${noteId}/download`),
  deleteNote: (id: string, noteId: string) => isOffline() ? mockClassroom.deleteNote(id, noteId) : request(`/classroom/${id}/notes/${noteId}`, { method: 'DELETE' }),
  getMessages: (id: string) => isOffline() ? mockClassroom.getMessages(id) : request(`/classroom/${id}/messages`),
  postMessage: (id: string, content: string) => isOffline() ? mockClassroom.postMessage(id, content) : request(`/classroom/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
};

// ─── Library API Methods ─────────────────────────────────────────
export const libraryApi = {
  getBooks: (params?: any) => {
    if (isOffline()) return mockLibrary.getBooks(params);
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search)   qs.set('search', params.search);
    if (params?.page)     qs.set('page', String(params.page));
    if (params?.limit)    qs.set('limit', String(params.limit));
    return request(`/library/books?${qs.toString()}`);
  },
  createBook: (body: any) => isOffline() ? mockLibrary.createBook(body) : request('/library/books', { method: 'POST', body: JSON.stringify(body) }),
  updateBook: (id: string, body: any) => isOffline() ? mockLibrary.updateBook(id, body) : request(`/library/books/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBook: (id: string) => isOffline() ? mockLibrary.deleteBook(id) : request(`/library/books/${id}`, { method: 'DELETE' }),
  getMyIssues: () => isOffline() ? mockLibrary.getMyIssues() : request('/library/my-issues'),
  getAllIssues: (params?: any) => {
    if (isOffline()) return mockLibrary.getAllIssues(params);
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.studentId) qs.set('studentId', params.studentId);
    return request(`/library/issues?${qs.toString()}`);
  },
  issueBook: (body: any) => isOffline() ? mockLibrary.issueBook(body) : request('/library/issue', { method: 'POST', body: JSON.stringify(body) }),
  returnBook: (issueId: string, remarks?: string) => isOffline() ? mockLibrary.returnBook(issueId, { remarks }) : request(`/library/issues/${issueId}/return`, { method: 'PUT', body: JSON.stringify({ remarks }) }),
  updatePenalty: (issueId: string, penaltyPaid: boolean) => request(`/library/issues/${issueId}/penalty`, { method: 'PATCH', body: JSON.stringify({ penaltyPaid }) }),
  getStats: () => isOffline() ? mockLibrary.getStats() : request('/library/stats'),
  searchStudents: (q: string) => isOffline() ? mockLibrary.searchStudents(q) : request(`/library/students?q=${encodeURIComponent(q)}`),
  toggleLibrarian: (userId: string, isLibrarian: boolean) => isOffline() ? mockLibrary.toggleLibrarian(userId, isLibrarian) : request(`/library/staff/${userId}`, { method: 'PATCH', body: JSON.stringify({ isLibrarian }) }),
};

// ─── Events API Methods ──────────────────────────────────────────
export const eventApi = {
  create: (body: any) => isOffline() ? mockEvent.create(body) : request('/events', { method: 'POST', body: JSON.stringify(body) }),
  list: (params?: any) => {
    if (isOffline()) return mockEvent.list(params);
    const qs = new URLSearchParams();
    if (params?.category && params.category !== 'all') qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request(`/events?${qs.toString()}`);
  },
  getById: (id: string) => isOffline() ? mockEvent.getById(id) : request(`/events/${id}`),
  update: (id: string, body: any) => isOffline() ? mockEvent.update(id, body) : request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => isOffline() ? mockEvent.delete(id) : request(`/events/${id}`, { method: 'DELETE' }),
  addFile: (id: string, body: any) => request(`/events/${id}/files`, { method: 'POST', body: JSON.stringify(body) }),
  downloadFile: (id: string, fileId: string) => request(`/events/${id}/files/${fileId}`),
  deleteFile: (id: string, fileId: string) => request(`/events/${id}/files/${fileId}`, { method: 'DELETE' }),
};

// ─── Lost & Found API ─────────────────────────────────────────────
export const lostFoundApi = {
  list: (params?: any) => isOffline() ? mockLostFound.list(params) : (() => { const q = new URLSearchParams(Object.entries(params ?? {}).filter(([,v]) => v) as any); return request(`/lost-found?${q.toString()}`); })(),
  getById: (id: string) => isOffline() ? mockLostFound.getById(id) : request(`/lost-found/${id}`),
  create: (body: any) => isOffline() ? mockLostFound.create(body) : request('/lost-found', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => isOffline() ? mockLostFound.update(id, body) : request(`/lost-found/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => isOffline() ? mockLostFound.delete(id) : request(`/lost-found/${id}`, { method: 'DELETE' }),
  claim: (id: string) => isOffline() ? mockLostFound.claim(id) : request(`/lost-found/${id}/claim`, { method: 'PATCH' }),
  addImage: (id: string, body: any) => request(`/lost-found/${id}/images`, { method: 'POST', body: JSON.stringify(body) }),
  deleteImage: (id: string, imageId: string) => request(`/lost-found/${id}/images/${imageId}`, { method: 'DELETE' }),
};

// ─── Map Pins ────────────────────────────────────────────────────
export const mapPinApi = {
  list: () => isOffline() ? mockMapPin.list() : request('/map-pins'),
  create: (body: any) => isOffline() ? mockMapPin.create(body) : request('/map-pins', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string) => isOffline() ? mockMapPin.delete(id) : request(`/map-pins/${id}`, { method: 'DELETE' }),
};

// ─── Communities ─────────────────────────────────────────────────
export const communityApi = {
  list: () => isOffline() ? mockCommunity.list() : request('/communities'),
  create: (body: any) => isOffline() ? mockCommunity.create(body) : request('/communities', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => isOffline() ? mockCommunity.update(id, body) : request(`/communities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => isOffline() ? mockCommunity.delete(id) : request(`/communities/${id}`, { method: 'DELETE' }),
};

// ─── Management ──────────────────────────────────────────────────
export const managementApi = {
  list: () => isOffline() ? mockManagement.list() : request('/management'),
  create: (body: any) => isOffline() ? mockManagement.create(body) : request('/management', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => isOffline() ? mockManagement.update(id, body) : request(`/management/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => isOffline() ? mockManagement.delete(id) : request(`/management/${id}`, { method: 'DELETE' }),
};

// ─── Assignments ─────────────────────────────────────────────────
export const assignmentApi = {
  list: (classroomId: string) => isOffline() ? mockAssignment.list(classroomId) : request(`/assignments/classroom/${classroomId}`),
  create: (classroomId: string, body: any) => isOffline() ? mockAssignment.create(classroomId, body) : request(`/assignments/classroom/${classroomId}`, { method: 'POST', body: JSON.stringify(body) }),
  submit: (assignmentId: string, body: any) => isOffline() ? mockAssignment.submit(assignmentId, body) : request(`/assignments/${assignmentId}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  getSubmission: (subId: string) => isOffline() ? mockAssignment.getSubmission(subId) : request(`/assignments/submission/${subId}`),
  grade: (subId: string, body: any) => isOffline() ? mockAssignment.grade(subId, body) : request(`/assignments/submission/${subId}/grade`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Chat ────────────────────────────────────────────────────────
export const chatApi = {
  searchUsers: (params: any) => isOffline() ? mockChat.searchUsers(params) : (() => { const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v) as any).toString(); return request(`/chat/users/search?${q}`); })(),
  getConversations: () => isOffline() ? mockChat.getConversations() : request('/chat/conversations'),
  startConversation: (targetUserId: string) => isOffline() ? mockChat.startConversation(targetUserId) : request('/chat/conversations', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  getMessages: (convoId: string) => isOffline() ? mockChat.getMessages(convoId) : request(`/chat/conversations/${convoId}/messages`),
  sendMessage: (convoId: string, content: string) => isOffline() ? mockChat.sendMessage(convoId, content) : request(`/chat/conversations/${convoId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  blockUser: (userId: string) => isOffline() ? mockChat.blockUser(userId) : request(`/chat/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId: string) => isOffline() ? mockChat.unblockUser(userId) : request(`/chat/users/${userId}/block`, { method: 'DELETE' }),
  getBlocked: () => isOffline() ? mockChat.getBlocked() : request('/chat/blocked'),
};

// ─── Fee Receipts ────────────────────────────────────────────────
export const feeReceiptApi = {
  upload: (body: object) => isOffline() ? mockAcademics.markFeePayment(body) : request('/academics/fees/receipt', { method: 'POST', body: JSON.stringify(body) }),
  review: (_paymentId: string, _action: string) => isOffline() ? Promise.resolve({ success: true, message: 'Reviewed (local)', data: {} }) : request(`/academics/fees/receipt/${_paymentId}/review`, { method: 'PUT', body: JSON.stringify({ action: _action }) }),
  getPending: () => isOffline() ? Promise.resolve({ success: true, message: 'OK', data: [] }) : request('/academics/fees/receipts/pending'),
};

// ─── Hostel API (always uses mockHostel — no backend) ────────────
export { mockHostel as hostelApi } from './mockApi';
