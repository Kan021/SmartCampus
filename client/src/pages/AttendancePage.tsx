import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { attendanceApi } from '../services/api';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

// ─── Types ───────────────────────────────────────────────────────
interface Session {
  id: string;
  subject: string;
  sessionCode: string;
  date: string;
  duration: number;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
  attendeeCount: number;
  faculty?: { fullName: string; email?: string };
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  markedAt: string;
  session: {
    subject: string;
    date: string;
    sessionCode: string;
    faculty: { fullName: string };
  };
}

interface SessionDetail {
  id: string;
  subject: string;
  sessionCode: string;
  date: string;
  expiresAt: string;
  records: {
    id: string;
    markedAt: string;
    student: {
      fullName: string;
      email: string;
      profile?: { rollNumber?: string; department?: string };
    };
  }[];
  faculty: { fullName: string };
}

export default function AttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = user?.role || 'student';

  // ─── Shared state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);

  // ─── Student state ─────────────────────────────────────────────
  const [scanCode, setScanCode] = useState('');
  const [marking, setMarking] = useState(false);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);

  // ─── Faculty state ─────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDuration, setNewDuration] = useState(15);
  const [creating, setCreating] = useState(false);
  const [activeQR, setActiveQR] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Session detail modal ──────────────────────────────────────
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Percentage widget ─────────────────────────────────────────
  const [pcData, setPcData] = useState<{ totalClasses: number; presentClasses: number; percentage: number } | null>(null);

  // ─── Timetable ─────────────────────────────────────────────────
  const [ttSection, setTtSection] = useState('');
  const [ttImage, setTtImage] = useState<string | null>(null);
  const [ttLoading, setTtLoading] = useState(false);
  const [showTimetable, setShowTimetable] = useState(false);
  // Admin upload
  const [ttUploadSection, setTtUploadSection] = useState('');
  const [ttUploadFile, setTtUploadFile] = useState<File | null>(null);
  const [ttUploading, setTtUploading] = useState(false);
  const ttFileRef = useRef<HTMLInputElement>(null);

  // ─── QR countdown timer (1 minute) ────────────────────────────
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startQrTimer() {
    setQrSecondsLeft(60);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    qrTimerRef.current = setInterval(() => {
      setQrSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(qrTimerRef.current!);
          setActiveQR(null);
          setActiveSession(null);
          toast.error('QR code expired! Generate a new one if needed.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function closeQrModal() {
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    setActiveQR(null);
    setActiveSession(null);
  }

  useEffect(() => () => { if (qrTimerRef.current) clearInterval(qrTimerRef.current); }, []);

  // ─── Auto-fill from QR scan URL param ──────────────────────────
  useEffect(() => {
    const code = searchParams.get('scan');
    if (code && role === 'student') {
      setScanCode(code.toUpperCase());
    }
  }, [searchParams, role]);

  // ─── Load data based on role ───────────────────────────────────
  useEffect(() => {
    loadData();
  }, [role]);

  async function loadData() {
    setLoading(true);
    try {
      if (role === 'student') {
        const [recRes, pcRes] = await Promise.all([
          attendanceApi.getMyRecords(),
          attendanceApi.getMyPercentage(),
        ]);
        if (recRes.success) setMyRecords(recRes.data || []);
        if (pcRes.success) setPcData(pcRes.data);
      } else {
        const res = await attendanceApi.getMySessions();
        if (res.success) setSessions(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data');
    }
    setLoading(false);
  }

  // ─── Timetable actions ────────────────────────────────────────
  async function loadTimetable(section: string) {
    setTtLoading(true);
    setTtImage(null);
    const res = await attendanceApi.getTimetable(section);
    if (res.success && res.data) {
      setTtImage(res.data.imageBase64);
    } else {
      toast.error('No timetable found for ' + section);
    }
    setTtLoading(false);
  }

  async function handleTtUpload() {
    if (!ttUploadSection.trim() || !ttUploadFile) { toast.error('Section and image required'); return; }
    setTtUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await attendanceApi.uploadTimetable(ttUploadSection.trim().toUpperCase(), base64);
      if (res.success) toast.success(res.message || 'Timetable saved!');
      else toast.error(res.message || 'Failed');
      setTtUploading(false);
      setTtUploadFile(null);
      setTtUploadSection('');
    };
    reader.readAsDataURL(ttUploadFile);
  }

  async function handleTtDelete(section: string) {
    const res = await attendanceApi.deleteTimetable(section);
    if (res.success) { toast.success('Deleted'); setTtImage(null); }
    else toast.error(res.message || 'Failed');
  }

  // ─── Student: Mark attendance ──────────────────────────────────
  async function handleMark() {
    if (!scanCode.trim() || scanCode.length !== 8) {
      toast.error('Please enter a valid 8-character session code.');
      return;
    }
    setMarking(true);
    try {
      const res = await attendanceApi.markAttendance(scanCode.toUpperCase());
      if (res.success) {
        toast.success(res.message || 'Attendance marked!');
        setScanCode('');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark attendance');
    }
    setMarking(false);
  }

  // ─── Faculty: Create session ───────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim()) {
      toast.error('Subject is required.');
      return;
    }
    setCreating(true);
    try {
      const res = await attendanceApi.createSession({
        subject: newSubject.trim(),
        date: new Date().toISOString(),
        duration: newDuration,
      });
      if (res.success) {
        toast.success('Session created! Share the QR code with students.');
        setNewSubject('');
        setShowCreate(false);
        // Show QR immediately
        showQRForSession(res.data);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create session');
    }
    setCreating(false);
  }

  // ─── Generate QR code for session ──────────────────────────────
  async function showQRForSession(session: Session) {
    setActiveSession(session);
    const url = `${window.location.origin}/attendance?scan=${session.sessionCode}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setActiveQR(dataUrl);
      startQrTimer(); // ← start 60-second countdown
    } catch {
      toast.error('Failed to generate QR code');
    }
  }

  // ─── View session detail ───────────────────────────────────────
  async function viewSessionDetail(sessionId: string) {
    setLoadingDetail(true);
    try {
      const res = await attendanceApi.getSessionRecords(sessionId);
      if (res.success) setDetailSession(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load session records');
    }
    setLoadingDetail(false);
  }

  // ─── Time helpers ──────────────────────────────────────────────
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  }
  function timeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <span style={{ fontSize: '24px' }}>📅</span>
          <h2>Attendance</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>
            {user.role === 'student' ? '🎓' : user.role === 'faculty' ? '👨‍🏫' : '🛠️'} {user.role}
          </span>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading...</p>
          </div>
        ) : role === 'student' ? (
          /* ═══════════════════════════════════════════════════════════
             STUDENT VIEW
             ═══════════════════════════════════════════════════════════ */
          <>
            {/* ─── Attendance Percentage Widget ─── */}
            {pcData && (
              <div className="att-pc-widget">
                <div className="att-pc-ring" style={{ '--pc': pcData.percentage } as any}>
                  <svg viewBox="0 0 100 100" width="110" height="110">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#e0e0e0" strokeWidth="8" />
                    <circle cx="50" cy="50" r="44" fill="none"
                      stroke={pcData.percentage >= 75 ? '#22c55e' : pcData.percentage >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(pcData.percentage / 100) * 276.46} 276.46`}
                      transform="rotate(-90 50 50)" />
                    <text x="50" y="50" textAnchor="middle" dy="6" fontSize="20" fontWeight="900"
                      fill={pcData.percentage >= 75 ? '#22c55e' : pcData.percentage >= 50 ? '#f59e0b' : '#ef4444'}>
                      {pcData.percentage}%
                    </text>
                  </svg>
                </div>
                <div className="att-pc-info">
                  <div className="att-pc-title">Attendance</div>
                  <div className="att-pc-detail">
                    <strong>{pcData.presentClasses}</strong> present out of <strong>{pcData.totalClasses}</strong> classes
                  </div>
                  {pcData.percentage < 75 && (
                    <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px', marginTop: '4px' }}>
                      ⚠️ Below 75% — attendance shortage
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scan Section */}
            <div className="att-scan-card">
              <h3>📱 Mark Your Attendance</h3>
              <p>Enter the 8-character code displayed by your faculty, or scan the QR code.</p>
              <div className="att-scan-row">
                <input
                  type="text"
                  className="form-input att-code-input"
                  placeholder="e.g. A3F1B2C4"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value.toUpperCase().slice(0, 8))}
                  maxLength={8}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleMark()}
                />
                <button
                  className="btn btn-primary att-mark-btn"
                  onClick={handleMark}
                  disabled={marking || scanCode.length !== 8}
                >
                  {marking ? <span className="loading-spinner" /> : '✓ Mark Attendance'}
                </button>
              </div>
              {scanCode.length > 0 && scanCode.length < 8 && (
                <p className="att-code-hint">{8 - scanCode.length} more character(s) needed</p>
              )}
            </div>

            {/* Attendance History */}
            <div className="att-history-section">
              <h3>📋 My Attendance History</h3>
              {myRecords.length === 0 ? (
                <div className="att-empty">
                  <p>No attendance records yet. Attend a class to see your history here.</p>
                </div>
              ) : (
                <div className="att-table-wrapper">
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Subject</th>
                        <th>Faculty</th>
                        <th>Date</th>
                        <th>Marked At</th>
                        <th>Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRecords.map((rec, i) => (
                        <tr key={rec.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{rec.session.subject}</td>
                          <td>{rec.session.faculty.fullName}</td>
                          <td>{formatDate(rec.session.date)}</td>
                          <td>{formatTime(rec.markedAt)}</td>
                          <td><code className="att-code-pill">{rec.session.sessionCode}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="att-total-count">
                Total classes attended: <strong>{myRecords.length}</strong>
              </p>
            </div>

            {/* ─── Timetable Card ─── */}
            <div className="att-sessions-section" style={{ marginTop: 0 }}>
              <h3 style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setShowTimetable(!showTimetable)}>
                🗓️ Timetable
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>{showTimetable ? '▼ Hide' : '▶ Show'}</span>
              </h3>
              {showTimetable && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Select your section to view the timetable:</p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <select className="form-input" value={ttSection} onChange={e => setTtSection(e.target.value)}
                      style={{ flex: 1, fontSize: '15px', fontWeight: 700 }}>
                      <option value="">— Choose Section —</option>
                      {['CS41','CS42','CS43','CS44','CS45','CS46','CS47','CS48','CS49'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary" disabled={!ttSection || ttLoading}
                      onClick={() => loadTimetable(ttSection)}>
                      {ttLoading ? '⏳' : '🔍 View'}
                    </button>
                  </div>
                  {ttImage && (
                    <div style={{ textAlign: 'center' }}>
                      <img src={ttImage} alt="Timetable" style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #000' }} />
                    </div>
                  )}
                  {ttLoading && <div style={{ textAlign: 'center', padding: '20px' }}><div className="loading-spinner" /></div>}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════
             FACULTY / ADMIN VIEW
             ═══════════════════════════════════════════════════════════ */
          <>
            {/* Stats Row */}
            <div className="att-stats-row">
              <div className="att-stat-card">
                <div className="att-stat-value">{sessions.length}</div>
                <div className="att-stat-label">Total Sessions</div>
              </div>
              <div className="att-stat-card">
                <div className="att-stat-value" style={{ color: '#22c55e' }}>
                  {sessions.filter(s => !s.isExpired && s.isActive).length}
                </div>
                <div className="att-stat-label">Active Now</div>
              </div>
              <div className="att-stat-card">
                <div className="att-stat-value" style={{ color: '#6366f1' }}>
                  {sessions.reduce((sum, s) => sum + s.attendeeCount, 0)}
                </div>
                <div className="att-stat-label">Total Check-ins</div>
              </div>
            </div>

            {/* Create Session Button / Form */}
            {!showCreate ? (
              <button className="btn btn-primary att-create-btn" onClick={() => setShowCreate(true)}>
                ＋ Create New Session
              </button>
            ) : (
              <form className="att-create-form" onSubmit={handleCreate}>
                <h3>📝 New Attendance Session</h3>
                <div className="form-grid-2">
                  <div>
                    <label className="form-label">Subject / Class Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Data Structures — Lecture 12"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="form-label">Duration (minutes)</label>
                    <select
                      className="form-input form-select"
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                    >
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min (default)</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </div>
                <div className="att-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? <span className="loading-spinner" /> : '✓ Create & Generate QR'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* QR Code Modal with 60-second countdown */}
            {activeQR && activeSession && (
              <div className="att-qr-overlay" onClick={closeQrModal}>
                <div className="att-qr-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>📱 Session QR Code</h3>
                  <p className="att-qr-subject">{activeSession.subject}</p>
                  <img src={activeQR} alt="QR Code" className="att-qr-image" />
                  <div className="att-qr-code-display">
                    <span>Session Code:</span>
                    <code>{activeSession.sessionCode}</code>
                  </div>

                  {/* ── Countdown Timer ── */}
                  <div className="att-qr-timer-wrap">
                    <svg className="att-qr-timer-svg" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke={qrSecondsLeft <= 10 ? '#ef4444' : '#C62828'}
                        strokeWidth="5"
                        strokeDasharray={`${(qrSecondsLeft / 60) * 175.9} 175.9`}
                        strokeLinecap="round"
                        transform="rotate(-90 32 32)"
                        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
                      />
                      <text x="32" y="37" textAnchor="middle"
                        fontSize="16" fontWeight="800"
                        fill={qrSecondsLeft <= 10 ? '#ef4444' : '#C62828'}>
                        {qrSecondsLeft}s
                      </text>
                    </svg>
                    <p className={`att-qr-countdown-label ${qrSecondsLeft <= 10 ? 'urgent' : ''}`}>
                      {qrSecondsLeft <= 10 ? '⚠️ Expiring soon!' : 'QR expires in'}
                    </p>
                  </div>

                  <p className="att-qr-hint">Students can scan this QR or enter the code manually.</p>
                  <button className="btn btn-secondary" onClick={closeQrModal}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Sessions List — Proper Table */}
            <div className="att-sessions-section">
              <h3>{role === 'admin' ? '📋 All Sessions' : '📋 My Sessions'}</h3>
              {sessions.length === 0 ? (
                <div className="att-empty">
                  <p>No sessions created yet. Create one to start taking attendance.</p>
                </div>
              ) : (
                <div className="att-table-wrapper" style={{ border: '1px solid #e0e0e0' }}>
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Subject</th>
                        {role === 'admin' && <th>Faculty</th>}
                        <th>Date</th>
                        <th>Time</th>
                        <th>Students</th>
                        <th>Status</th>
                        <th>Code</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.id} style={s.isExpired ? { opacity: 0.65 } : {}}>
                          <td style={{ fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, fontSize: '14px' }}>{s.subject}</td>
                          {role === 'admin' && <td>{s.faculty?.fullName || '—'}</td>}
                          <td>{formatDate(s.date)}</td>
                          <td>{formatTime(s.date)}</td>
                          <td style={{ fontWeight: 700 }}>{s.attendeeCount}</td>
                          <td>
                            <span className={`att-status-pill ${s.isExpired ? 'expired' : 'live'}`}>
                              {s.isExpired ? '⏱ Expired' : '🟢 Live'}
                            </span>
                          </td>
                          <td><code className="att-code-pill">{s.sessionCode}</code></td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {!s.isExpired && (
                              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px', marginRight: '6px' }}
                                onClick={() => showQRForSession(s)}>📱 QR</button>
                            )}
                            <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}
                              onClick={() => viewSessionDetail(s.id)}>📋 Records</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="att-total-count">Total: <strong>{sessions.length}</strong> session{sessions.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Session Detail Modal */}
            {(detailSession || loadingDetail) && (
              <div className="att-qr-overlay" onClick={() => setDetailSession(null)}>
                <div className="att-detail-modal" onClick={(e) => e.stopPropagation()}>
                  {loadingDetail ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="loading-spinner" />
                    </div>
                  ) : detailSession ? (
                    <>
                      <h3>📋 {detailSession.subject}</h3>
                      <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                        {formatDate(detailSession.date)} · By {detailSession.faculty.fullName} · Code: <code className="att-code-pill">{detailSession.sessionCode}</code>
                      </p>
                      {detailSession.records.length === 0 ? (
                        <div className="att-empty">
                          <p>No students have marked attendance for this session.</p>
                        </div>
                      ) : (
                        <div className="att-table-wrapper">
                          <table className="att-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Student</th>
                                <th>Roll No</th>
                                <th>Department</th>
                                <th>Marked At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailSession.records.map((r, i) => (
                                <tr key={r.id}>
                                  <td>{i + 1}</td>
                                  <td style={{ fontWeight: 600 }}>{r.student.fullName}</td>
                                  <td>{r.student.profile?.rollNumber || '—'}</td>
                                  <td>{r.student.profile?.department || '—'}</td>
                                  <td>{formatTime(r.markedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="att-total-count">
                        Total: <strong>{detailSession.records.length}</strong> student{detailSession.records.length !== 1 ? 's' : ''}
                      </p>
                    </>
                  ) : null}
                  <button className="btn btn-secondary" onClick={() => setDetailSession(null)} style={{ marginTop: '16px' }}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* ─── Timetable Management (Admin) ─── */}
            {role === 'admin' && (
              <div className="att-sessions-section" style={{ marginTop: '24px' }}>
                <h3>🗓️ Timetable Management</h3>
                <div className="ar-form-card" style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '120px' }}>
                      <label className="form-label">Section</label>
                      <select className="form-input" value={ttUploadSection} onChange={e => setTtUploadSection(e.target.value)}>
                        <option value="">— Section —</option>
                        {['CS41','CS42','CS43','CS44','CS45','CS46','CS47','CS48','CS49'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 2, marginBottom: 0, minWidth: '200px' }}>
                      <label className="form-label">Timetable Image</label>
                      <div className="ar-file-area" onClick={() => ttFileRef.current?.click()} style={{ padding: '10px' }}>
                        <div className="ar-file-icon">{ttUploadFile ? '✅' : '📎'}</div>
                        <div className="ar-file-text" style={{ fontSize: '13px' }}>{ttUploadFile ? ttUploadFile.name : 'Click to select image'}</div>
                        <input ref={ttFileRef} type="file" accept="image/*" onChange={e => setTtUploadFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleTtUpload} disabled={ttUploading || !ttUploadSection || !ttUploadFile}>
                      {ttUploading ? '⏳ Uploading...' : '📤 Upload / Update Timetable'}
                    </button>
                    {ttUploadSection && (
                      <button className="btn btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleTtDelete(ttUploadSection)}>
                        🗑️ Delete
                      </button>
                    )}
                  </div>

                  {/* Preview */}
                  {ttUploadSection && (
                    <div style={{ marginTop: '16px' }}>
                      <button className="btn btn-secondary" onClick={() => loadTimetable(ttUploadSection)} style={{ marginBottom: '10px' }}>
                        👁️ Preview {ttUploadSection} Timetable
                      </button>
                      {ttImage && (
                        <div style={{ textAlign: 'center' }}>
                          <img src={ttImage} alt="Timetable" style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #000' }} />
                        </div>
                      )}
                      {ttLoading && <div style={{ textAlign: 'center', padding: '20px' }}><div className="loading-spinner" /></div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {role === 'faculty' && (
              <div className="att-sessions-section" style={{ marginTop: 0 }}>
                <h3 style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setShowTimetable(!showTimetable)}>
                  🗓️ Timetable
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>{showTimetable ? '▼ Hide' : '▶ Show'}</span>
                </h3>
                {showTimetable && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <select className="form-input" value={ttSection} onChange={e => setTtSection(e.target.value)}
                        style={{ flex: 1, fontSize: '15px', fontWeight: 700 }}>
                        <option value="">— Choose Section —</option>
                        {['CS41','CS42','CS43','CS44','CS45','CS46','CS47','CS48','CS49'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button className="btn btn-primary" disabled={!ttSection || ttLoading}
                        onClick={() => loadTimetable(ttSection)}>
                        {ttLoading ? '⏳' : '🔍 View'}
                      </button>
                    </div>
                    {ttImage && (
                      <div style={{ textAlign: 'center' }}>
                        <img src={ttImage} alt="Timetable" style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #000' }} />
                      </div>
                    )}
                    {ttLoading && <div style={{ textAlign: 'center', padding: '20px' }}><div className="loading-spinner" /></div>}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
