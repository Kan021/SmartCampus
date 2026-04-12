const API_URL = 'http://localhost:5000/api';

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

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    // Try to refresh token if expired
    if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry the original request
        const newToken = localStorage.getItem('accessToken');
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        };
        const retryResponse = await fetch(`${API_URL}${endpoint}`, config);
        return retryResponse.json();
      }
    }
    throw data;
  }

  return data;
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
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  verifyOtp: (body: { email: string; code: string; type: string }) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  resendOtp: (body: { email: string; type: string }) =>
    request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  refresh: () => refreshToken(),
};

// ─── Profile API Methods ─────────────────────────────────────────
export const profileApi = {
  // Current user
  getMyProfile: () => request('/profile/me'),

  updateMyProfile: (body: {
    phone?: string | null;
    bio?: string | null;
    department?: string | null;
    avatarBase64?: string | null;
    rollNumber?: string | null;
    year?: number | null;
    employeeId?: string | null;
    designation?: string | null;
    adminCode?: string | null;
  }) => request('/profile/me', { method: 'PUT', body: JSON.stringify(body) }),

  // Admin only
  listUsers: (params?: { page?: number; limit?: number; role?: string; search?: string; year?: number; section?: string; course?: string }) => {
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

  getUserById: (userId: string) => request(`/profile/${userId}`),

  updateUserRole: (userId: string, role: string) =>
    request(`/profile/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  updateUserProfile: (userId: string, body: Record<string, any>) =>
    request(`/profile/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),

  bulkUpdateProfiles: (userIds: string[], updates: Record<string, any>) =>
    request('/profile/bulk-update', { method: 'POST', body: JSON.stringify({ userIds, updates }) }),
};

// ─── Attendance API Methods ──────────────────────────────────────
export const attendanceApi = {
  // Faculty/Admin: create a session
  createSession: (body: { subject: string; date: string; duration: number }) =>
    request('/attendance/sessions', { method: 'POST', body: JSON.stringify(body) }),

  // Faculty/Admin: list my sessions (admin sees all)
  getMySessions: () => request('/attendance/sessions'),

  // Get session by code (for QR scan verification)
  getSessionByCode: (code: string) => request(`/attendance/sessions/${code}`),

  // Student: mark attendance
  markAttendance: (sessionCode: string) =>
    request('/attendance/mark', { method: 'POST', body: JSON.stringify({ sessionCode }) }),

  // Student: my attendance records
  getMyRecords: () => request('/attendance/my-records'),

  // Faculty/Admin: session attendee records
  getSessionRecords: (sessionId: string) => request(`/attendance/sessions/${sessionId}/records`),

  // Admin: overall stats
  getStats: () => request('/attendance/stats'),

  // Percentage
  getMyPercentage: () => request('/attendance/my-percentage'),

  // Timetable
  getTimetable: (section: string) => request(`/attendance/timetable/${section}`),
  uploadTimetable: (section: string, imageBase64: string) =>
    request('/attendance/timetable', { method: 'POST', body: JSON.stringify({ section, imageBase64 }) }),
  deleteTimetable: (section: string) => request(`/attendance/timetable/${section}`, { method: 'DELETE' }),
};

// ─── Notice API Methods ──────────────────────────────────────────
export const noticeApi = {
  create: (body: { title: string; content: string; category: string; pdfBase64?: string; pdfFileName?: string }) =>
    request('/notices', { method: 'POST', body: JSON.stringify(body) }),

  list: (params?: { page?: number; limit?: number; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.category) qs.set('category', params.category);
    return request(`/notices?${qs.toString()}`);
  },

  bulletin: () => request('/notices/bulletin'),

  getById: (id: string) => request(`/notices/${id}`),

  downloadPdf: (id: string) => request(`/notices/${id}/pdf`),

  delete: (id: string) => request(`/notices/${id}`, { method: 'DELETE' }),
};

// ─── Academics API Methods ───────────────────────────────────────
export const academicsApi = {
  // Subjects
  getSubjects: (params?: { semester?: number; department?: string }) => {
    const qs = new URLSearchParams();
    if (params?.semester) qs.set('semester', String(params.semester));
    if (params?.department) qs.set('department', params.department);
    return request(`/academics/subjects?${qs.toString()}`);
  },
  createSubject: (body: { name: string; code: string; semester: number; department: string; credits?: number; maxInternal?: number; maxExternal?: number }) =>
    request('/academics/subjects', { method: 'POST', body: JSON.stringify(body) }),

  // Marks
  getMyMarks: () => request('/academics/marks/my'),
  uploadMark: (body: { studentId: string; subjectId: string; internal: number; external: number; semester: number }) =>
    request('/academics/marks', { method: 'POST', body: JSON.stringify(body) }),
  bulkUploadMarks: (marks: { studentId: string; subjectId: string; internal: number; external: number; semester: number }[]) =>
    request('/academics/marks/bulk', { method: 'POST', body: JSON.stringify({ marks }) }),

  // Fees
  getFeeStructures: (params?: { semester?: number; course?: string }) => {
    const qs = new URLSearchParams();
    if (params?.semester) qs.set('semester', String(params.semester));
    if (params?.course) qs.set('course', params.course);
    return request(`/academics/fees/structures?${qs.toString()}`);
  },
  createFeeStructure: (body: { semester: number; year: number; course: string; category: string; amount: number; dueDate?: string }) =>
    request('/academics/fees/structures', { method: 'POST', body: JSON.stringify(body) }),
  getMyFees: () => request('/academics/fees/my'),
  markFeePayment: (body: { studentId: string; feeStructureId: string; amountPaid: number; transactionRef?: string; remarks?: string }) =>
    request('/academics/fees/pay', { method: 'POST', body: JSON.stringify(body) }),
  getFeeSummary: () => request('/academics/fees/summary'),

  // Calendar
  getCalendarEvents: () => request('/academics/calendar'),
  createCalendarEvent: (body: { title: string; date: string; description?: string; endDate?: string; category?: string }) =>
    request('/academics/calendar', { method: 'POST', body: JSON.stringify(body) }),
  deleteCalendarEvent: (id: string) => request(`/academics/calendar/${id}`, { method: 'DELETE' }),
};

// ─── Classroom API Methods ───────────────────────────────────────
export const classroomApi = {
  getMyClassroom: () => request('/classroom/my'),
  createClassroom: (course: string, section: string) =>
    request('/classroom/create', { method: 'POST', body: JSON.stringify({ course, section }) }),
  getMembers: (id: string) => request(`/classroom/${id}/members`),
  getNotes: (id: string) => request(`/classroom/${id}/notes`),
  uploadNote: (id: string, body: { title: string; description?: string; fileName: string; fileBase64: string; fileType: string }) =>
    request(`/classroom/${id}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  downloadNote: (id: string, noteId: string) => request(`/classroom/${id}/notes/${noteId}/download`),
  deleteNote: (id: string, noteId: string) => request(`/classroom/${id}/notes/${noteId}`, { method: 'DELETE' }),
  getMessages: (id: string) => request(`/classroom/${id}/messages`),
  postMessage: (id: string, content: string) =>
    request(`/classroom/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
};

// ─── Library API Methods ─────────────────────────────────────────
export const libraryApi = {
  // Books
  getBooks: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search)   qs.set('search', params.search);
    if (params?.page)     qs.set('page', String(params.page));
    if (params?.limit)    qs.set('limit', String(params.limit));
    return request(`/library/books?${qs.toString()}`);
  },
  createBook: (body: {
    title: string; author: string; isbn: string; category?: string;
    publisher?: string; publishYear?: number; description?: string;
    totalCopies?: number; shelfLocation?: string;
  }) => request('/library/books', { method: 'POST', body: JSON.stringify(body) }),
  updateBook: (id: string, body: Record<string, any>) =>
    request(`/library/books/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBook: (id: string) =>
    request(`/library/books/${id}`, { method: 'DELETE' }),

  // Student: my issued books
  getMyIssues: () => request('/library/my-issues'),

  // Staff: all issues
  getAllIssues: (params?: { status?: string; studentId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status)    qs.set('status', params.status);
    if (params?.studentId) qs.set('studentId', params.studentId);
    if (params?.page)      qs.set('page', String(params.page));
    if (params?.limit)     qs.set('limit', String(params.limit));
    return request(`/library/issues?${qs.toString()}`);
  },
  issueBook: (body: { bookId: string; studentId: string; dueDate: string; remarks?: string; penaltyRate?: number }) =>
    request('/library/issue', { method: 'POST', body: JSON.stringify(body) }),
  returnBook: (issueId: string, remarks?: string) =>
    request(`/library/issues/${issueId}/return`, { method: 'PUT', body: JSON.stringify({ remarks }) }),
  updatePenalty: (issueId: string, penaltyPaid: boolean) =>
    request(`/library/issues/${issueId}/penalty`, { method: 'PATCH', body: JSON.stringify({ penaltyPaid }) }),

  // Stats
  getStats: () => request('/library/stats'),

  // Student search for issue form
  searchStudents: (q: string) => request(`/library/students?q=${encodeURIComponent(q)}`),

  // Admin: toggle librarian
  toggleLibrarian: (userId: string, isLibrarian: boolean) =>
    request(`/library/staff/${userId}`, { method: 'PATCH', body: JSON.stringify({ isLibrarian }) }),
};

// ─── Events API Methods ──────────────────────────────────────────
export const eventApi = {
  create: (body: {
    title: string; description: string; venue: string;
    eventDate: string; endDate?: string | null;
    category?: string; organizerType?: string; organizerName: string;
    clubName?: string | null; clubContact?: string | null; clubLogoBase64?: string | null;
    facultyName?: string | null; facultyPhone?: string | null; facultyEmail?: string | null;
    registrationLink?: string | null; maxParticipants?: number | null;
    tags?: string; isPublished?: boolean;
  }) => request('/events', { method: 'POST', body: JSON.stringify(body) }),

  list: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== 'all') qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request(`/events?${qs.toString()}`);
  },

  getById: (id: string) => request(`/events/${id}`),

  update: (id: string, body: Record<string, any>) =>
    request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string) => request(`/events/${id}`, { method: 'DELETE' }),

  addFile: (id: string, body: { fileName: string; fileBase64: string; fileType: string; fileSizeKb?: number }) =>
    request(`/events/${id}/files`, { method: 'POST', body: JSON.stringify(body) }),

  downloadFile: (id: string, fileId: string) => request(`/events/${id}/files/${fileId}`),

  deleteFile: (id: string, fileId: string) =>
    request(`/events/${id}/files/${fileId}`, { method: 'DELETE' }),
};

// ─── Lost & Found API ─────────────────────────────────────────────
export const lostFoundApi = {
  list: (params?: { category?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.status)   q.set('status',   params.status);
    if (params?.search)   q.set('search',   params.search);
    if (params?.page)     q.set('page',     String(params.page));
    if (params?.limit)    q.set('limit',    String(params.limit));
    return request(`/lost-found?${q.toString()}`);
  },
  getById:     (id: string) => request(`/lost-found/${id}`),
  create: (body: object)    => request('/lost-found', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: object) => request(`/lost-found/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string)      => request(`/lost-found/${id}`, { method: 'DELETE' }),
  claim:  (id: string)      => request(`/lost-found/${id}/claim`, { method: 'PATCH' }),
  addImage: (id: string, body: { imageBase64: string; caption?: string }) =>
    request(`/lost-found/${id}/images`, { method: 'POST', body: JSON.stringify(body) }),
  deleteImage: (id: string, imageId: string) =>
    request(`/lost-found/${id}/images/${imageId}`, { method: 'DELETE' }),
};

// ─── Map Pins ────────────────────────────────────────────────────
export const mapPinApi = {
  list:   ()                    => request('/map-pins'),
  create: (body: object)       => request('/map-pins', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string)         => request(`/map-pins/${id}`, { method: 'DELETE' }),
};

// ─── Communities ─────────────────────────────────────────────────
export const communityApi = {
  list:   ()              => request('/communities'),
  create: (body: object)  => request('/communities', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: object) => request(`/communities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string)    => request(`/communities/${id}`, { method: 'DELETE' }),
};

// ─── Management ──────────────────────────────────────────────────
export const managementApi = {
  list:   ()              => request('/management'),
  create: (body: object)  => request('/management', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: object) => request(`/management/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string)    => request(`/management/${id}`, { method: 'DELETE' }),
};

// ─── Assignments ─────────────────────────────────────────────────
export const assignmentApi = {
  list:   (classroomId: string) => request(`/assignments/classroom/${classroomId}`),
  create: (classroomId: string, body: object) => request(`/assignments/classroom/${classroomId}`, { method: 'POST', body: JSON.stringify(body) }),
  submit: (assignmentId: string, body: object) => request(`/assignments/${assignmentId}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  getSubmission: (subId: string) => request(`/assignments/submission/${subId}`),
  grade: (subId: string, body: object) => request(`/assignments/submission/${subId}/grade`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Chat ────────────────────────────────────────────────────────
export const chatApi = {
  searchUsers: (params: { name?: string; year?: string; section?: string }) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return request(`/chat/users/search?${q}`);
  },
  getConversations: () => request('/chat/conversations'),
  startConversation: (targetUserId: string) => request('/chat/conversations', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  getMessages: (convoId: string) => request(`/chat/conversations/${convoId}/messages`),
  sendMessage: (convoId: string, content: string) => request(`/chat/conversations/${convoId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  blockUser: (userId: string) => request(`/chat/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId: string) => request(`/chat/users/${userId}/block`, { method: 'DELETE' }),
  getBlocked: () => request('/chat/blocked'),
};

// ─── Fee Receipts ────────────────────────────────────────────────
export const feeReceiptApi = {
  upload: (body: object) => request('/academics/fees/receipt', { method: 'POST', body: JSON.stringify(body) }),
  review: (paymentId: string, action: string) => request(`/academics/fees/receipt/${paymentId}/review`, { method: 'PUT', body: JSON.stringify({ action }) }),
  getPending: () => request('/academics/fees/receipts/pending'),
};

