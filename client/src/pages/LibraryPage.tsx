import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { libraryApi, profileApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

// ─── Types ────────────────────────────────────────────────────────
interface Book {
  id: string; title: string; author: string; isbn: string;
  category: string; publisher?: string; publishYear?: number;
  description?: string; totalCopies: number; availableCopies: number;
  shelfLocation?: string;
}

interface BookIssue {
  id: string; bookId: string; studentId: string; issuedById: string;
  issueDate: string; dueDate: string; returnDate?: string;
  status: 'issued' | 'overdue' | 'returned';
  penaltyAmount: number; penaltyPaid: boolean; penaltyRate: number;
  livePenalty?: number; isOverdue?: boolean; remarks?: string;
  book: { title: string; author: string; isbn: string; category: string; shelfLocation?: string };
  student: { fullName: string; email: string; profile?: { rollNumber?: string; course?: string; year?: number } };
  issuedBy: { fullName: string };
}

interface LibraryStats {
  totalBooks: number; totalCopies: number; issued: number;
  overdue: number; returned: number; unpaidPenalties: number; unpaidPenaltyTotal: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: '📚 General', academic: '🎓 Academic', reference: '📖 Reference',
  novel: '📕 Novel', journal: '📰 Journal', magazine: '📄 Magazine',
};

const STATUS_COLORS: Record<string, string> = {
  issued: '#22c55e', overdue: '#ef4444', returned: '#6b7280',
};

const LIBRARY_ADDRESS = '6th Floor, Babu Banarasi Das University, Lucknow, UP — 226028';
const LIBRARY_HOURS   = 'Mon–Sat: 9:00 AM – 7:00 PM  |  Sun: Closed';
const PENALTY_RATE    = '₹2 per day after due date';

// ─── Helpers ──────────────────────────────────────────────────────
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysLeft(due: string | Date) {
  const diff = new Date(due).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  return days;
}

// ─── Main Component ───────────────────────────────────────────────
export default function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isStaff, setIsStaff] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-books' | 'catalogue' | 'issues' | 'issue-book' | 'stats'>('my-books');

  // Check if current user is library staff
  useEffect(() => {
    if (user?.role === 'admin') { setIsStaff(true); setActiveTab('catalogue'); return; }
    if (user?.role === 'faculty') {
      profileApi.getMyProfile().then(res => {
        const isLib = res.data?.profile?.isLibrarian ?? false;
        setIsStaff(isLib);
        setActiveTab(isLib ? 'catalogue' : 'my-books');
      });
    }
  }, [user]);

  if (!user) return null;

  const tabs = [
    ...(user.role === 'student' || !isStaff ? [{ id: 'my-books', label: '📚 My Books' }] : []),
    { id: 'catalogue',  label: '🗂️ Catalogue' },
    ...(isStaff ? [
      { id: 'issues',     label: '📋 All Issues' },
      { id: 'issue-book', label: '📤 Issue Book' },
      { id: 'stats',      label: '📊 Stats' },
    ] : []),
  ];

  return (
    <div className="dashboard-layout">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', objectFit: 'contain' }} />
          <h2>Library</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>
            {user.role === 'student' ? '🎓' : isStaff ? '📚' : '👨‍🏫'} {isStaff && user.role === 'faculty' ? 'Librarian' : user.role}
          </span>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ paddingTop: '24px' }}>
        {/* ── Library Info Banner ─────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px',
          padding: '20px 24px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '48px' }}>🏛️</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontWeight: 900, fontSize: '20px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              BBDU Central Library
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
              📍 {LIBRARY_ADDRESS}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              🕒 {LIBRARY_HOURS}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
              ⚠️ Fine: {PENALTY_RATE}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              📞 Ext: 1204
            </div>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '9px 18px', borderRadius: '10px', fontWeight: 700,
                fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-surface-card)',
                color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)',
                boxShadow: activeTab === tab.id ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Contents ────────────────────────────────────── */}
        {activeTab === 'my-books'   && <MyBooksTab userId={user.id} />}
        {activeTab === 'catalogue'  && <CatalogueTab isStaff={isStaff} userRole={user.role} />}
        {activeTab === 'issues'     && isStaff && <AllIssuesTab />}
        {activeTab === 'issue-book' && isStaff && <IssueBookTab librarianId={user.id} onSuccess={() => setActiveTab('issues')} />}
        {activeTab === 'stats'      && isStaff && <StatsTab />}
      </main>
    </div>
  );
}

// ─── MY BOOKS TAB (student view) ─────────────────────────────────
function MyBooksTab({ userId }: { userId: string }) {
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    libraryApi.getMyIssues().then(res => {
      if (res.success) setIssues(res.data || []);
    }).catch(() => toast.error('Failed to load library records')).finally(() => setLoading(false));
  }, []);

  const active    = issues.filter(i => i.status !== 'returned');
  const overdue   = issues.filter(i => i.status === 'overdue');
  const returned  = issues.filter(i => i.status === 'returned');
  const unpaidFines = issues.filter(i => i.status === 'returned' && !i.penaltyPaid && i.penaltyAmount > 0);
  const totalFine   = issues.reduce((s, i) => s + (i.livePenalty ?? i.penaltyAmount), 0);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="loading-spinner" /></div>;

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Active Issues', value: active.length, color: '#6366f1', icon: '📗' },
          { label: 'Overdue', value: overdue.length, color: '#ef4444', icon: '⚠️' },
          { label: 'Returned', value: returned.length, color: '#22c55e', icon: '✅' },
          { label: 'Fine Due', value: `₹${totalFine}`, color: totalFine > 0 ? '#f59e0b' : '#22c55e', icon: '💰' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface-card)', borderRadius: '14px',
            padding: '18px 20px', border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {issues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p>No library records yet. Visit the library desk to borrow books!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {issues.map(issue => (
            <BookIssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Issue Card ───────────────────────────────────────────────────
function BookIssueCard({ issue, showStudent = false }: { issue: BookIssue; showStudent?: boolean }) {
  const dl = daysLeft(issue.dueDate);
  const overdue = issue.status === 'overdue' || (issue.status === 'issued' && dl < 0);
  const fine = issue.livePenalty ?? issue.penaltyAmount;

  const statusStyle: React.CSSProperties = {
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
    background: issue.status === 'issued' ? 'rgba(34,197,94,0.15)'
      : issue.status === 'overdue' ? 'rgba(239,68,68,0.15)'
      : 'rgba(107,114,128,0.15)',
    color: STATUS_COLORS[issue.status],
  };

  return (
    <div style={{
      background: 'var(--color-surface-card)',
      border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
      borderLeft: `4px solid ${STATUS_COLORS[issue.status] || '#6b7280'}`,
      borderRadius: '14px', padding: '18px 20px',
      display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap',
    }}>
      {/* Book icon */}
      <div style={{
        width: '52px', height: '68px', borderRadius: '8px', flexShrink: 0,
        background: issue.status === 'issued' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : issue.status === 'overdue' ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : 'linear-gradient(135deg, #374151, #4b5563)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '4px',
      }}>
        <span style={{ fontSize: '24px' }}>📘</span>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: '180px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={statusStyle}>{issue.status.toUpperCase()}</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {CATEGORY_LABELS[issue.book.category] ?? issue.book.category}
          </span>
        </div>
        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
          {issue.book.title}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          by {issue.book.author}
          {issue.book.shelfLocation && <span> · Shelf: <strong style={{ color: 'var(--color-accent-primary)' }}>{issue.book.shelfLocation}</strong></span>}
        </div>
        {showStudent && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
            👤 {issue.student.fullName}
            {issue.student.profile?.rollNumber && ` · Roll: ${issue.student.profile.rollNumber}`}
          </div>
        )}
        <div style={{ display: 'flex', gap: '18px', fontSize: '12px', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
          <span>📅 Issued: {fmtDate(issue.issueDate)}</span>
          <span style={{ color: overdue ? '#ef4444' : dl <= 3 && issue.status !== 'returned' ? '#f59e0b' : 'var(--color-text-muted)', fontWeight: overdue ? 700 : 400 }}>
            {issue.status === 'returned' ? `✅ Returned: ${fmtDate(issue.returnDate!)}` : `⏰ Due: ${fmtDate(issue.dueDate)} (${dl > 0 ? `${dl}d left` : `${Math.abs(dl)}d overdue`})`}
          </span>
          <span>📚 Issued by: {issue.issuedBy.fullName}</span>
        </div>
      </div>

      {/* Penalty */}
      {(fine > 0 || issue.status === 'overdue') && (
        <div style={{
          background: issue.penaltyPaid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${issue.penaltyPaid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '10px', padding: '12px 16px', textAlign: 'center', minWidth: '110px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', marginBottom: '2px' }}>FINE</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: issue.penaltyPaid ? '#22c55e' : '#ef4444' }}>
            ₹{fine}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px', color: issue.penaltyPaid ? '#22c55e' : '#ef4444' }}>
            {issue.penaltyPaid ? '✓ PAID' : '● UNPAID'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CATALOGUE TAB ────────────────────────────────────────────────
function CatalogueTab({ isStaff, userRole }: { isStaff: boolean; userRole: string }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Add book form state
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category: 'academic', publisher: '', publishYear: '', description: '', totalCopies: '1', shelfLocation: '' });
  const [saving, setSaving] = useState(false);

  const loadBooks = useCallback(async (cat = category, q = search) => {
    setLoading(true);
    try {
      const res = await libraryApi.getBooks({ category: cat !== 'all' ? cat : undefined, search: q || undefined, limit: 50 });
      if (res.success) setBooks(res.data.books || []);
    } catch { toast.error('Failed to load books'); }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { loadBooks(); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => loadBooks(category, val), 400);
    setSearchTimeout(t);
  };

  const handleCategoryChange = (cat: string) => { setCategory(cat); loadBooks(cat, search); };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await libraryApi.createBook({
        ...form,
        publishYear: form.publishYear ? parseInt(form.publishYear) : undefined,
        totalCopies: parseInt(form.totalCopies) || 1,
      });
      if (res.success) {
        toast.success('Book added to catalogue!');
        setShowAddForm(false);
        setForm({ title: '', author: '', isbn: '', category: 'academic', publisher: '', publishYear: '', description: '', totalCopies: '1', shelfLocation: '' });
        loadBooks();
      }
    } catch (err: any) { toast.error(err.message || 'Failed to add book'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from catalogue?`)) return;
    const res = await libraryApi.deleteBook(id);
    if (res.success) { toast.success('Book removed.'); loadBooks(); }
    else toast.error('Failed to delete book');
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
          <input className="form-input" style={{ paddingLeft: '38px' }} placeholder="Search by title, author, ISBN..." value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ maxWidth: '160px' }} value={category} onChange={e => handleCategoryChange(e.target.value)}>
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {isStaff && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(s => !s)}>
            {showAddForm ? '✕ Cancel' : '＋ Add Book'}
          </button>
        )}
      </div>

      {/* Add Book Form */}
      {showAddForm && (
        <form className="att-create-form" onSubmit={handleAddBook} style={{ marginBottom: '24px' }}>
          <h3>📗 Add Book to Catalogue</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Book title" />
            </div>
            <div className="form-group">
              <label className="form-label">Author *</label>
              <input className="form-input" required value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" />
            </div>
            <div className="form-group">
              <label className="form-label">ISBN *</label>
              <input className="form-input" required value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} placeholder="978-..." />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Publisher</label>
              <input className="form-input" value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} placeholder="Publisher name" />
            </div>
            <div className="form-group">
              <label className="form-label">Publish Year</label>
              <input className="form-input" type="number" min="1800" max="2099" value={form.publishYear} onChange={e => setForm(f => ({ ...f, publishYear: e.target.value }))} placeholder="e.g. 2022" />
            </div>
            <div className="form-group">
              <label className="form-label">Total Copies</label>
              <input className="form-input" type="number" min="1" max="500" value={form.totalCopies} onChange={e => setForm(f => ({ ...f, totalCopies: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Shelf Location</label>
              <input className="form-input" value={form.shelfLocation} onChange={e => setForm(f => ({ ...f, shelfLocation: e.target.value }))} placeholder="e.g. A-12" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">Description (optional)</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short book description..." style={{ resize: 'vertical' }} />
          </div>
          <div className="att-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" /> : '📗 Add to Library'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Books Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}><div className="loading-spinner" /></div>
      ) : books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p>No books found matching your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {books.map(book => (
            <div key={book.id} style={{
              background: 'var(--color-surface-card)', borderRadius: '14px',
              border: '1px solid var(--color-border)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                }}>
                  {CATEGORY_LABELS[book.category] ?? book.category}
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: book.availableCopies > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: book.availableCopies > 0 ? '#22c55e' : '#ef4444',
                }}>
                  {book.availableCopies}/{book.totalCopies} available
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{book.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>by <strong>{book.author}</strong></div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {book.isbn && <span>📋 {book.isbn}</span>}
                {book.shelfLocation && <span>📍 Shelf: <strong style={{ color: 'var(--color-accent-primary)' }}>{book.shelfLocation}</strong></span>}
                {book.publishYear && <span>🗓 {book.publishYear}</span>}
              </div>
              {book.description && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {book.description}
                </div>
              )}
              {isStaff && userRole === 'admin' && (
                <button
                  onClick={() => handleDelete(book.id, book.title)}
                  style={{ alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px', padding: '4px 8px' }}
                >
                  🗑 Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ALL ISSUES TAB (staff) ───────────────────────────────────────
function AllIssuesTab() {
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [returning, setReturning] = useState<string | null>(null);
  const [penaltyLoading, setPenaltyLoading] = useState<string | null>(null);

  const load = useCallback(async (st = statusFilter, pg = page) => {
    setLoading(true);
    try {
      const res = await libraryApi.getAllIssues({ status: st !== 'all' ? st : undefined, page: pg, limit: 20 });
      if (res.success) {
        setIssues(res.data.issues || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch { toast.error('Failed to load issues'); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [statusFilter, page]);

  const handleReturn = async (issue: BookIssue) => {
    if (!confirm(`Mark "${issue.book.title}" as returned by ${issue.student.fullName}?`)) return;
    setReturning(issue.id);
    try {
      const res = await libraryApi.returnBook(issue.id);
      if (res.success) { toast.success(res.message || 'Book returned!'); load(); }
    } catch (err: any) { toast.error(err.message || 'Failed to process return'); }
    setReturning(null);
  };

  const handlePenalty = async (issue: BookIssue, paid: boolean) => {
    setPenaltyLoading(issue.id);
    const res = await libraryApi.updatePenalty(issue.id, paid);
    if (res.success) { toast.success(res.message || 'Updated!'); load(); }
    else toast.error('Failed to update penalty');
    setPenaltyLoading(null);
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', 'issued', 'overdue', 'returned'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} style={{
            padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: statusFilter === s ? '#6366f1' : 'var(--color-surface-card)',
            color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
          }}>
            {s === 'all' ? 'All' : s === 'issued' ? '📗 Issued' : s === 'overdue' ? '⚠️ Overdue' : '✅ Returned'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}><div className="loading-spinner" /></div>
      ) : issues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p>No issue records found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {issues.map(issue => (
            <div key={issue.id} style={{
              background: 'var(--color-surface-card)',
              border: `1px solid ${issue.status === 'overdue' ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
              borderLeft: `4px solid ${STATUS_COLORS[issue.status] || '#6b7280'}`,
              borderRadius: '14px', padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                      background: issue.status === 'issued' ? 'rgba(34,197,94,0.15)' : issue.status === 'overdue' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                      color: STATUS_COLORS[issue.status],
                    }}>{issue.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>{issue.book.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>by {issue.book.author}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    👤 <strong>{issue.student.fullName}</strong> · {issue.student.email}
                    {issue.student.profile?.rollNumber && ` · Roll: ${issue.student.profile.rollNumber}`}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>📅 Issued: {fmtDate(issue.issueDate)}</span>
                    <span style={{ color: issue.status === 'overdue' ? '#ef4444' : 'inherit', fontWeight: issue.status === 'overdue' ? 700 : 400 }}>
                      ⏰ Due: {fmtDate(issue.dueDate)}
                    </span>
                    {issue.returnDate && <span>✅ Returned: {fmtDate(issue.returnDate)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  {/* Fine display */}
                  {((issue.livePenalty ?? issue.penaltyAmount) > 0) && (
                    <div style={{
                      padding: '8px 14px', borderRadius: '10px', textAlign: 'center',
                      background: issue.penaltyPaid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${issue.penaltyPaid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>FINE</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: issue.penaltyPaid ? '#22c55e' : '#ef4444' }}>
                        ₹{issue.livePenalty ?? issue.penaltyAmount}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: issue.penaltyPaid ? '#22c55e' : '#ef4444' }}>
                        {issue.penaltyPaid ? '✓ PAID' : '● UNPAID'}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {issue.status !== 'returned' && (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                        onClick={() => handleReturn(issue)}
                        disabled={returning === issue.id}
                      >
                        {returning === issue.id ? '⏳' : '↩️ Return'}
                      </button>
                    )}
                    {issue.status === 'returned' && (issue.livePenalty ?? issue.penaltyAmount) > 0 && (
                      <button
                        className={`btn ${issue.penaltyPaid ? 'btn-ghost' : 'btn-primary'}`}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                        onClick={() => handlePenalty(issue, !issue.penaltyPaid)}
                        disabled={penaltyLoading === issue.id}
                      >
                        {penaltyLoading === issue.id ? '⏳' : issue.penaltyPaid ? '↩ Mark Unpaid' : '✓ Mark Fine Paid'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>{page} / {totalPages}</span>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ISSUE BOOK TAB (staff) ───────────────────────────────────────
function IssueBookTab({ librarianId, onSuccess }: { librarianId: string; onSuccess: () => void }) {
  const [studentQuery, setStudentQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [bookQuery, setBookQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0];
  });
  const [penaltyRate, setPenaltyRate] = useState('2');
  const [remarks, setRemarks] = useState('');
  const [issuing, setIssuing] = useState(false);
  const studentSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Student search
  const handleStudentSearch = (q: string) => {
    setStudentQuery(q);
    setSelectedStudent(null);
    if (studentSearchTimer.current) clearTimeout(studentSearchTimer.current);
    if (q.length < 2) { setStudents([]); return; }
    studentSearchTimer.current = setTimeout(async () => {
      const res = await libraryApi.searchStudents(q);
      if (res.success) setStudents(res.data || []);
    }, 350);
  };

  // Book search
  const handleBookSearch = async (q: string) => {
    setBookQuery(q);
    setSelectedBook(null);
    if (q.length < 2) { setBooks([]); return; }
    const res = await libraryApi.getBooks({ search: q, limit: 10 });
    if (res.success) setBooks(res.data.books || []);
  };

  const handleIssue = async () => {
    if (!selectedStudent) { toast.error('Select a student'); return; }
    if (!selectedBook) { toast.error('Select a book'); return; }
    if (!dueDate) { toast.error('Set a due date'); return; }
    if (selectedBook.availableCopies <= 0) { toast.error('No copies available!'); return; }

    setIssuing(true);
    try {
      const res = await libraryApi.issueBook({
        bookId: selectedBook.id,
        studentId: selectedStudent.id,
        dueDate,
        remarks: remarks || undefined,
        penaltyRate: parseFloat(penaltyRate) || 2,
      });
      if (res.success) {
        toast.success(res.message || 'Book issued!');
        setSelectedStudent(null); setSelectedBook(null);
        setStudentQuery(''); setBookQuery(''); setRemarks('');
        onSuccess();
      }
    } catch (err: any) { toast.error(err.message || 'Failed to issue book'); }
    setIssuing(false);
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '24px', color: 'var(--color-text-primary)' }}>
        📤 Issue Book to Student
      </h3>

      {/* Step 1: Find Student */}
      <div style={{ background: 'var(--color-surface-card)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px', letterSpacing: '0.06em' }}>STEP 1 — FIND STUDENT</div>
        {selectedStudent ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-accent-primary)' }}>✓ {selectedStudent.fullName}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{selectedStudent.email} {selectedStudent.profile?.rollNumber && `· Roll: ${selectedStudent.profile.rollNumber}`}</div>
            </div>
            <button onClick={() => { setSelectedStudent(null); setStudentQuery(''); setStudents([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px' }}>✕</button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <input className="form-input" placeholder="Search by name, email or roll number..." value={studentQuery} onChange={e => handleStudentSearch(e.target.value)} autoComplete="off" />
            {students.length > 0 && (
              <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                {students.map(s => (
                  <div key={s.id} onClick={() => { setSelectedStudent(s); setStudentQuery(s.fullName); setStudents([]); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.fullName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{s.email} {s.profile?.rollNumber && `· ${s.profile.rollNumber}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Find Book */}
      <div style={{ background: 'var(--color-surface-card)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px', letterSpacing: '0.06em' }}>STEP 2 — SELECT BOOK</div>
        {selectedBook ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#22c55e' }}>✓ {selectedBook.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>by {selectedBook.author} · ISBN: {selectedBook.isbn} · {selectedBook.availableCopies} copies available</div>
            </div>
            <button onClick={() => { setSelectedBook(null); setBookQuery(''); setBooks([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px' }}>✕</button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <input className="form-input" placeholder="Search by title, author or ISBN..." value={bookQuery} onChange={e => handleBookSearch(e.target.value)} autoComplete="off" />
            {books.length > 0 && (
              <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', zIndex: 50, overflow: 'hidden', maxHeight: '260px', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                {books.map(b => (
                  <div key={b.id} onClick={() => { setSelectedBook(b); setBookQuery(b.title); setBooks([]); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', opacity: b.availableCopies <= 0 ? 0.5 : 1, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{b.title}</span>
                      <span style={{ fontSize: '12px', color: b.availableCopies > 0 ? '#22c55e' : '#ef4444' }}>
                        {b.availableCopies > 0 ? `✓ ${b.availableCopies} avail.` : '✗ Unavailable'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>by {b.author} · {b.isbn}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Due Date */}
      <div style={{ background: 'var(--color-surface-card)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px', letterSpacing: '0.06em' }}>STEP 3 — DUE DATE & TERMS</div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label className="form-label">Penalty Rate (₹/day)</label>
            <input className="form-input" type="number" min="0" max="100" step="0.5" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks (optional)</label>
          <input className="form-input" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes about this issue..." />
        </div>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700 }}
        onClick={handleIssue}
        disabled={issuing || !selectedStudent || !selectedBook}
      >
        {issuing ? <><span className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Issuing...</> : '📤 Issue Book'}
      </button>
    </div>
  );
}

// ─── STATS TAB (staff) ────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    libraryApi.getStats().then(res => { if (res.success) setStats(res.data); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="loading-spinner" /></div>;
  if (!stats) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>Failed to load stats.</div>;

  const statCards = [
    { label: 'Total Books (Titles)', value: stats.totalBooks, color: '#6366f1', icon: '📚' },
    { label: 'Total Copies', value: stats.totalCopies, color: '#8b5cf6', icon: '📗' },
    { label: 'Currently Issued', value: stats.issued, color: '#22c55e', icon: '📤' },
    { label: 'Overdue', value: stats.overdue, color: '#ef4444', icon: '⚠️' },
    { label: 'Returned (All Time)', value: stats.returned, color: '#64748b', icon: '↩️' },
    { label: 'Unpaid Penalty Records', value: stats.unpaidPenalties, color: '#f59e0b', icon: '💰' },
  ];

  return (
    <div>
      <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '20px' }}>📊 Library Statistics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: 'var(--color-surface-card)', borderRadius: '14px', padding: '20px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Unpaid Penalty Summary */}
      {stats.unpaidPenalties > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '14px', padding: '20px 24px',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>
            💰 Total Unpaid Fines
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#ef4444' }}>
            ₹{stats.unpaidPenaltyTotal.toFixed(0)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Across {stats.unpaidPenalties} returned book(s) — go to <em>All Issues</em> tab to mark as paid.
          </div>
        </div>
      )}

      {/* Library Info Footer */}
      <div style={{
        marginTop: '28px', background: 'var(--color-surface-card)', borderRadius: '14px',
        padding: '20px 24px', border: '1px solid var(--color-border)',
      }}>
        <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px' }}>🏛️ Library Contact & Location</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 2 }}>
          <div>📍 <strong>Address:</strong> {LIBRARY_ADDRESS}</div>
          <div>🕒 <strong>Hours:</strong> {LIBRARY_HOURS}</div>
          <div>⚠️ <strong>Penalty Rate:</strong> {PENALTY_RATE}</div>
          <div>📞 <strong>Extension:</strong> 1204</div>
        </div>
      </div>
    </div>
  );
}
