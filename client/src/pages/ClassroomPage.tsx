import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { classroomApi } from '../services/api';

type Tab = 'people' | 'notes' | 'messages';

interface Member {
  id: string; role: string;
  user: {
    id: string; fullName: string; email: string; role: string;
    profile?: {
      avatarBase64?: string; rollNumber?: string; phone?: string;
      section?: string; course?: string; year?: number; department?: string;
      designation?: string; employeeId?: string;
    };
  };
}

interface Note {
  id: string; title: string; description?: string;
  fileName: string; fileType: string;
  uploaderName: string; uploaderRole: string; createdAt: string;
}

interface Message {
  id: string; content: string; createdAt: string;
  sender: { fullName: string; role: string };
}

const fileTypeIcon: Record<string, string> = {
  pdf: '📄', image: '🖼️', doc: '📝', ppt: '📊', xls: '📈', zip: '📦', video: '🎬',
};

export default function ClassroomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<{ id: string; name: string; course: string; section: string } | null>(null);
  const [allClassrooms, setAllClassrooms] = useState<{ id: string; name: string; course: string; section: string; _count: { members: number } }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>('people');
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  // People
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Member | null>(null);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgContent, setMsgContent] = useState('');
  const [posting, setPosting] = useState(false);

  const role = user?.role || 'student';

  // Init — get classroom
  useEffect(() => {
    (async () => {
      try {
        const res = await classroomApi.getMyClassroom();
        if (res.success && res.data) {
          if (res.data.isAdmin) {
            setIsAdmin(true);
            setAllClassrooms(res.data.classrooms || []);
          } else if (res.data.classroom) {
            setClassroom(res.data.classroom);
          }
        } else {
          setErrMsg(res.message || 'Could not load classroom. Set your course and section in Profile.');
        }
      } catch {
        setErrMsg('Failed to load classroom. Please set your course & section in Profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectAdminClassroom = (cr: typeof allClassrooms[0]) => {
    setClassroom({ id: cr.id, name: cr.name, course: cr.course, section: cr.section });
  };

  const backToList = () => {
    setClassroom(null);
    setMembers([]); setNotes([]); setMessages([]);
    setTab('people');
  };

  // Admin create classroom
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState('');
  const [newSection, setNewSection] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateClassroom = async () => {
    if (!newCourse.trim() || !newSection.trim()) { toast.error('Course and section required'); return; }
    setCreating(true);
    const res = await classroomApi.createClassroom(newCourse.trim(), newSection.trim());
    if (res.success) {
      toast.success(res.message || 'Classroom created!');
      setShowCreate(false); setNewCourse(''); setNewSection('');
      // Refresh list
      const r2 = await classroomApi.getMyClassroom();
      if (r2.success && r2.data?.classrooms) setAllClassrooms(r2.data.classrooms);
    } else { toast.error(res.message || 'Failed'); }
    setCreating(false);
  };

  // Load tab data
  useEffect(() => {
    if (!classroom) return;
    if (tab === 'people') loadMembers();
    if (tab === 'notes') loadNotes();
    if (tab === 'messages') loadMessages();
  }, [tab, classroom]);

  const loadMembers = async () => {
    if (!classroom) return;
    const res = await classroomApi.getMembers(classroom.id);
    if (res.success) setMembers(res.data?.members || []);
  };

  const loadNotes = async () => {
    if (!classroom) return;
    const res = await classroomApi.getNotes(classroom.id);
    if (res.success) setNotes(res.data?.notes || []);
  };

  const loadMessages = async () => {
    if (!classroom) return;
    const res = await classroomApi.getMessages(classroom.id);
    if (res.success) setMessages(res.data?.messages || []);
  };

  // Upload note
  const handleUploadNote = async () => {
    if (!classroom || !noteFile || !noteTitle.trim()) { toast.error('Title and file required'); return; }
    if (noteFile.size > 20 * 1024 * 1024) { toast.error('Max file size is 20 MB'); return; }

    setUploading(true);
    try {
      const base64 = await fileToBase64(noteFile);
      const ext = noteFile.name.split('.').pop()?.toLowerCase() || '';
      let fileType = 'doc';
      if (ext === 'pdf') fileType = 'pdf';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image';
      else if (['ppt', 'pptx'].includes(ext)) fileType = 'ppt';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) fileType = 'xls';
      else if (['zip', 'rar', '7z'].includes(ext)) fileType = 'zip';
      else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) fileType = 'video';

      const res = await classroomApi.uploadNote(classroom.id, {
        title: noteTitle.trim(), description: noteDesc.trim() || undefined,
        fileName: noteFile.name, fileBase64: base64, fileType,
      });
      if (res.success) {
        toast.success('Note uploaded!');
        setShowUpload(false); setNoteTitle(''); setNoteDesc(''); setNoteFile(null);
        loadNotes();
      } else { toast.error(res.message || 'Upload failed'); }
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  // Download note
  const handleDownload = async (noteId: string) => {
    if (!classroom) return;
    const res = await classroomApi.downloadNote(classroom.id, noteId);
    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = res.data.fileBase64;
      link.download = res.data.fileName;
      link.click();
      toast.success('Download started');
    } else { toast.error('Download failed'); }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!classroom) return;
    const res = await classroomApi.deleteNote(classroom.id, noteId);
    if (res.success) { toast.success('Deleted'); loadNotes(); }
  };

  // Post message
  const handlePostMessage = async () => {
    if (!classroom || !msgContent.trim()) return;
    setPosting(true);
    const res = await classroomApi.postMessage(classroom.id, msgContent.trim());
    if (res.success) { setMsgContent(''); loadMessages(); toast.success('Message posted'); }
    else { toast.error(res.message || 'Failed'); }
    setPosting(false);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <span style={{ fontSize: '24px' }}>📖</span>
          <h2>{classroom ? classroom.name : 'Classroom'}</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>{roleEmoji[user.role]} {user.role}</span>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="dashboard-content" style={{ maxWidth: '960px', margin: '0 auto', padding: '28px' }}>
        {loading ? (
          <div className="acad-empty"><span style={{ fontSize: '48px' }}>⏳</span><p>Loading classroom...</p></div>
        ) : errMsg ? (
          <div className="acad-empty">
            <span style={{ fontSize: '48px' }}>📖</span>
            <p style={{ fontWeight: 700, fontSize: '18px' }}>{errMsg}</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/profile')}>
              Go to Profile Settings
            </button>
          </div>
        ) : isAdmin && !classroom ? (
          /* ═══ ADMIN CLASSROOM PICKER ═══ */
          <div className="cr-section">
            <div className="cr-banner">
              <div className="cr-banner-icon">🛠️</div>
              <div>
                <div className="cr-banner-name">Admin — All Classrooms</div>
                <div className="cr-banner-sub">Select a classroom to view</div>
              </div>
            </div>
            {allClassrooms.length === 0 ? (
              <div className="acad-empty">
                <span style={{ fontSize: '48px' }}>📭</span>
                <p style={{ fontWeight: 700, fontSize: '18px' }}>No classrooms exist yet.</p>
                <p style={{ color: 'var(--color-text-muted)' }}>Classrooms are created automatically when students log in with their section set.</p>
              </div>
            ) : (
              <div className="cr-admin-grid">
                {allClassrooms.map(cr => (
                  <div className="cr-admin-card" key={cr.id} onClick={() => selectAdminClassroom(cr)}>
                    <div className="cr-admin-card-icon">📖</div>
                    <div className="cr-admin-card-name">{cr.name}</div>
                    <div className="cr-admin-card-info">{cr.course} — Section {cr.section}</div>
                    <div className="cr-admin-card-count">👥 {cr._count.members} members</div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Classroom */}
            <div style={{ marginTop: '20px' }}>
              {!showCreate ? (
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '16px', padding: '14px' }} onClick={() => setShowCreate(true)}>
                  ➕ Create New Classroom
                </button>
              ) : (
                <div className="ar-form-card">
                  <h3 style={{ marginBottom: '14px', fontSize: '18px', fontWeight: 800 }}>Create Classroom</h3>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Course Code</label>
                      <input className="form-input" value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder="e.g. CS" />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Section</label>
                      <input className="form-input" value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="e.g. 41" />
                    </div>
                  </div>
                  {newCourse && newSection && (
                    <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '15px', fontWeight: 700, color: '#1a237e' }}>
                      Will create: <strong>{newCourse}{newSection}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateClassroom} disabled={creating}>
                      {creating ? '⏳ Creating...' : '✅ Create'}
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : classroom ? (
          <>
            {/* Classroom Banner */}
            <div className="cr-banner">
              <div className="cr-banner-icon">📖</div>
              <div style={{ flex: 1 }}>
                <div className="cr-banner-name">{classroom.name}</div>
                <div className="cr-banner-sub">{classroom.course} — Section {classroom.section}</div>
              </div>
              {isAdmin && (
                <button className="btn btn-ghost" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }} onClick={backToList}>
                  ↩ Switch Classroom
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="acad-tabs">
              <button className={`acad-tab${tab === 'people' ? ' active' : ''}`} onClick={() => setTab('people')}>👥 People</button>
              <button className={`acad-tab${tab === 'notes' ? ' active' : ''}`} onClick={() => setTab('notes')}>📚 Notes</button>
              <button className={`acad-tab${tab === 'messages' ? ' active' : ''}`} onClick={() => setTab('messages')}>💬 Messages</button>
            </div>

            {/* ═══ PEOPLE TAB ═══ */}
            {tab === 'people' && (
              <div className="cr-section">
                {/* Faculty */}
                <h3 className="ar-section-title">Faculty</h3>
                <div className="cr-people-grid">
                  {members.filter(m => m.role === 'faculty').map(m => (
                    <div className="cr-person-card" key={m.id} onClick={() => setSelectedPerson(m)}>
                      <div className="cr-person-avatar faculty">
                        {m.user.profile?.avatarBase64 ? (
                          <img src={m.user.profile.avatarBase64} alt="" />
                        ) : m.user.fullName.charAt(0)}
                      </div>
                      <div className="cr-person-name">{m.user.fullName}</div>
                      <div className="cr-person-role">Faculty</div>
                    </div>
                  ))}
                  {members.filter(m => m.role === 'faculty').length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '12px' }}>No faculty assigned yet</div>
                  )}
                </div>

                <h3 className="ar-section-title" style={{ marginTop: '24px' }}>Students</h3>
                <div className="cr-people-grid">
                  {members.filter(m => m.role === 'student').map(m => (
                    <div className="cr-person-card" key={m.id} onClick={() => setSelectedPerson(m)}>
                      <div className="cr-person-avatar">
                        {m.user.profile?.avatarBase64 ? (
                          <img src={m.user.profile.avatarBase64} alt="" />
                        ) : m.user.fullName.charAt(0)}
                      </div>
                      <div className="cr-person-name">{m.user.fullName}</div>
                      <div className="cr-person-role">{m.user.profile?.rollNumber || 'Student'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Person Detail Modal */}
            {selectedPerson && (
              <div className="modal-overlay" onClick={() => setSelectedPerson(null)}>
                <div className="cr-person-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setSelectedPerson(null)}>✕</button>
                  <div className="cr-modal-avatar">
                    {selectedPerson.user.profile?.avatarBase64 ? (
                      <img src={selectedPerson.user.profile.avatarBase64} alt="" />
                    ) : (
                      <span>{selectedPerson.user.fullName.charAt(0)}</span>
                    )}
                  </div>
                  <h3>{selectedPerson.user.fullName}</h3>
                  <p className="cr-modal-role">{selectedPerson.role === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student'}</p>
                  <div className="cr-modal-details">
                    {selectedPerson.user.profile?.rollNumber && <div><strong>Roll No:</strong> {selectedPerson.user.profile.rollNumber}</div>}
                    {selectedPerson.user.profile?.phone && <div><strong>Phone:</strong> {selectedPerson.user.profile.phone}</div>}
                    {selectedPerson.user.profile?.department && <div><strong>Department:</strong> {selectedPerson.user.profile.department}</div>}
                    {selectedPerson.user.profile?.year && <div><strong>Year:</strong> {selectedPerson.user.profile.year}</div>}
                    {selectedPerson.user.profile?.designation && <div><strong>Designation:</strong> {selectedPerson.user.profile.designation}</div>}
                    <div><strong>Email:</strong> {selectedPerson.user.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ NOTES TAB ═══ */}
            {tab === 'notes' && (
              <div className="cr-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="ar-section-title" style={{ margin: 0 }}>Shared Notes</h3>
                  <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
                    {showUpload ? 'Cancel' : '+ Upload Note'}
                  </button>
                </div>

                {showUpload && (
                  <div className="ar-form-card" style={{ marginBottom: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Title *</label>
                      <input className="form-input" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="e.g. Unit 3 — Data Structures" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description (optional)</label>
                      <input className="form-input" value={noteDesc} onChange={e => setNoteDesc(e.target.value)} placeholder="Brief description" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">File * (Max 20 MB)</label>
                      <div className="ar-file-area" onClick={() => fileRef.current?.click()}>
                        <div className="ar-file-icon">{noteFile ? '✅' : '📎'}</div>
                        <div className="ar-file-text">{noteFile ? noteFile.name : 'Click to select file'}</div>
                        <div className="ar-file-hint">PDF, Images, PPT, DOC, Videos</div>
                        <input ref={fileRef} type="file" onChange={e => setNoteFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUploadNote} disabled={uploading}>
                      {uploading ? '⏳ Uploading...' : '📤 Upload Note'}
                    </button>
                  </div>
                )}

                {notes.length === 0 ? (
                  <div className="acad-empty"><span style={{ fontSize: '40px' }}>📂</span><p>No notes uploaded yet. Be the first!</p></div>
                ) : (
                  <div className="cr-notes-list">
                    {notes.map(n => (
                      <div className="cr-note-card" key={n.id}>
                        <div className="cr-note-icon">{fileTypeIcon[n.fileType] || '📄'}</div>
                        <div className="cr-note-body">
                          <div className="cr-note-title">{n.title}</div>
                          {n.description && <div className="cr-note-desc">{n.description}</div>}
                          <div className="cr-note-meta">
                            <span>{n.uploaderRole === 'faculty' ? '👨‍🏫' : '🎓'} {n.uploaderName}</span>
                            <span>·</span>
                            <span>{timeAgo(n.createdAt)}</span>
                            <span>·</span>
                            <span>{n.fileName}</span>
                          </div>
                        </div>
                        <div className="cr-note-actions">
                          <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => handleDownload(n.id)}>⬇ Download</button>
                          {(role === 'admin') && (
                            <button className="btn btn-ghost" style={{ fontSize: '12px', color: '#dc2626' }} onClick={() => handleDeleteNote(n.id)}>🗑️</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ MESSAGES TAB ═══ */}
            {tab === 'messages' && (
              <div className="cr-section">
                <h3 className="ar-section-title">Faculty Announcements</h3>

                {(role === 'faculty' || role === 'admin') && (
                  <div className="ar-form-card" style={{ marginBottom: '20px' }}>
                    <textarea
                      className="form-input form-textarea"
                      value={msgContent}
                      onChange={e => setMsgContent(e.target.value)}
                      rows={3}
                      placeholder="Post a message to this classroom..."
                    />
                    <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handlePostMessage} disabled={posting}>
                      {posting ? '⏳ Posting...' : '📩 Post Message'}
                    </button>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="acad-empty"><span style={{ fontSize: '40px' }}>💬</span><p>No messages yet.</p></div>
                ) : (
                  <div className="cr-msg-list">
                    {messages.map(m => (
                      <div className="cr-msg-card" key={m.id}>
                        <div className="cr-msg-sender">
                          <span className="cr-msg-sender-badge">{m.sender.role === 'faculty' ? '👨‍🏫' : '🛠️'}</span>
                          <strong>{m.sender.fullName}</strong>
                          <span className="cr-msg-time">{timeAgo(m.createdAt)}</span>
                        </div>
                        <div className="cr-msg-content">{m.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
