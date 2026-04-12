import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { noticeApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  pdfFileName?: string;
  pdfUrl?: string;        // resolved static URL (preferred)
  isPublished: boolean;
  createdAt: string;
  author: { fullName: string; role: string };
}

const CATEGORIES = [
  { value: 'all', label: '📋 All' },
  { value: 'urgent', label: '🚨 Urgent' },
  { value: 'academic', label: '📚 Academic' },
  { value: 'exam', label: '📝 Exam' },
  { value: 'event', label: '🎉 Event' },
  { value: 'general', label: '📢 General' },
];

export default function NoticesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'student';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadNotices(); }, [category, page]);

  async function loadNotices() {
    setLoading(true);
    try {
      const res = await noticeApi.list({ page, limit: 20, category: category !== 'all' ? category : undefined });
      if (res.success) {
        setNotices(res.data.notices || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load notices');
    }
    setLoading(false);
  }

  // ─── Create notice ─────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setCreating(true);
    try {
      let pdfBase64: string | undefined;
      let pdfFileName: string | undefined;

      if (pdfFile) {
        pdfFileName = pdfFile.name;
        pdfBase64 = await fileToBase64(pdfFile);
      }

      const res = await noticeApi.create({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        pdfBase64,
        pdfFileName,
      });

      if (res.success) {
        toast.success('Notice published!');
        setNewTitle('');
        setNewContent('');
        setNewCategory('general');
        setPdfFile(null);
        setShowCreate(false);
        loadNotices();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create notice');
    }
    setCreating(false);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─── Download PDF ─────────────────────────────────────────────
  async function handleDownload(notice: Notice) {
    // If notice already has a direct URL from the list (static PDF), use it directly
    if (notice.pdfUrl) {
      const link = document.createElement('a');
      link.href = notice.pdfUrl;
      link.download = notice.pdfFileName || 'notice.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloading PDF...');
      return;
    }

    // Fallback: fetch via API (handles base64 PDFs for manually uploaded notices)
    try {
      const res = await noticeApi.downloadPdf(notice.id);
      if (res.success && res.data) {
        if (res.data.isStatic && res.data.pdfUrl) {
          // Static file — open in new tab / trigger download
          const link = document.createElement('a');
          link.href = res.data.pdfUrl;
          link.download = res.data.fileName || 'notice.pdf';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (res.data.pdfBase64) {
          // Base64 PDF — decode and download
          const link = document.createElement('a');
          link.href = res.data.pdfBase64;
          link.download = res.data.fileName || notice.pdfFileName || 'notice.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        toast.success('Downloading PDF...');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to download PDF');
    }
  }

  // ─── Delete notice ─────────────────────────────────────────────
  async function handleDelete(noticeId: string) {
    if (!confirm('Delete this notice?')) return;
    try {
      const res = await noticeApi.delete(noticeId);
      if (res.success) {
        toast.success('Notice deleted.');
        loadNotices();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete notice');
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function categoryBadge(cat: string) {
    const map: Record<string, string> = {
      urgent: '🚨 Urgent', academic: '📚 Academic', exam: '📝 Exam',
      event: '🎉 Event', general: '📢 General',
    };
    return map[cat] || cat;
  }

  const hasPdf = (n: Notice) => !!(n.pdfUrl || n.pdfFileName);

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={bbdLogo} alt="BBD University" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <h2 style={{ margin: 0, lineHeight: 1.2 }}>Notices</h2>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>BBD University — Official Bulletin</span>
          </div>
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
        {/* Category filter */}
        <div className="notice-filter-bar">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`notice-filter-btn ${category === c.value ? 'active' : ''}`}
              onClick={() => { setCategory(c.value); setPage(1); }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Create button (faculty/admin) */}
        {role !== 'student' && (
          !showCreate ? (
            <button className="btn btn-primary att-create-btn" onClick={() => setShowCreate(true)}>
              ＋ Publish New Notice
            </button>
          ) : (
            <form className="att-create-form" onSubmit={handleCreate}>
              <h3>📢 New Notice</h3>
              <div className="form-grid-2">
                <div>
                  <label className="form-label">Title</label>
                  <input type="text" className="form-input" placeholder="Notice title..." value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input form-select" value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="exam">Exam</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label className="form-label">Content / Description</label>
                <textarea className="form-input" rows={4} placeholder="Notice details..."
                  value={newContent} onChange={(e) => setNewContent(e.target.value)} required
                  style={{ resize: 'vertical', minHeight: '80px' }} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <label className="form-label">Attach PDF (optional)</label>
                <input type="file" accept=".pdf" ref={fileInputRef}
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '14px' }} />
                {pdfFile && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>📎 {pdfFile.name}</p>}
              </div>
              <div className="att-form-actions">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="loading-spinner" /> : '📢 Publish Notice'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          )
        )}

        {/* Notices list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="loading-spinner" />
          </div>
        ) : notices.length === 0 ? (
          <div className="att-empty">
            <p>No notices found{category !== 'all' ? ` in "${category}" category` : ''}.</p>
          </div>
        ) : (
          <div className="notice-list">
            {notices.map((n) => (
              <div key={n.id} className={`notice-card notice-card-rect ${n.category}`}>
                {/* Left icon column */}
                <div className={`notice-doc-icon ${hasPdf(n) ? 'pdf' : 'text'}`}>
                  {hasPdf(n) ? (
                    <>
                      <span className="notice-doc-emoji">📄</span>
                      <span className="notice-doc-type">PDF</span>
                    </>
                  ) : (
                    <span className="notice-doc-emoji">📋</span>
                  )}
                </div>

                {/* Main content */}
                <div className="notice-card-body">
                  <div className="notice-card-header">
                    <div className="notice-meta-row">
                      <span className={`notice-category-badge ${n.category}`}>{categoryBadge(n.category)}</span>
                      <span className="notice-date">{formatDate(n.createdAt)} · {formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <h4 className="notice-title">{n.title}</h4>
                  <p className="notice-content">{n.content}</p>
                  <div className="notice-footer">
                    <span className="notice-author">📌 By {n.author.fullName}</span>
                    <div className="notice-actions">
                      {hasPdf(n) && (
                        <button
                          className="btn notice-download-btn"
                          onClick={() => handleDownload(n)}
                          title={`Download: ${n.pdfFileName || 'notice.pdf'}`}
                        >
                          ⬇ Download PDF
                        </button>
                      )}
                      {(role === 'admin' || role === 'faculty') && (
                        <button className="btn btn-ghost notice-delete-btn" onClick={() => handleDelete(n.id)}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>{page} / {totalPages}</span>
            <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </main>
    </div>
  );
}
