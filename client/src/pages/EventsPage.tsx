import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

// ─── Types ────────────────────────────────────────────────────────
interface EventFile {
  id: string; fileName: string; fileType: string;
  fileSizeKb?: number | null; createdAt: string;
}
interface Event {
  id: string; title: string; description: string; venue: string;
  eventDate: string; endDate?: string | null; category: string;
  organizerType: string; organizerName: string;
  clubName?: string | null; clubContact?: string | null;
  facultyName?: string | null; facultyPhone?: string | null; facultyEmail?: string | null;
  registrationLink?: string | null; maxParticipants?: number | null;
  tags: string; isPublished: boolean; createdAt: string; authorId: string;
  author: { id: string; fullName: string; role: string };
  files: EventFile[];
}

// ─── Constants ────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',       label: 'All Events',  icon: '🎯' },
  { key: 'cultural',  label: 'Cultural',    icon: '🎭' },
  { key: 'technical', label: 'Technical',   icon: '⚙️'  },
  { key: 'sports',    label: 'Sports',      icon: '🏆'  },
  { key: 'academic',  label: 'Academic',    icon: '🎓'  },
  { key: 'workshop',  label: 'Workshop',    icon: '🛠️'  },
  { key: 'seminar',   label: 'Seminar',     icon: '🎤'  },
  { key: 'general',   label: 'General',     icon: '📌'  },
];

// Left-border accent colours per category (fits white-card theme)
const CAT_COLOR: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  cultural:  { border: '#e91e8c', bg: 'rgba(233,30,140,0.06)', badge: 'rgba(233,30,140,0.12)', text: '#c2185b' },
  technical: { border: '#1976D2', bg: 'rgba(25,118,210,0.06)', badge: 'rgba(25,118,210,0.12)', text: '#1565C0' },
  sports:    { border: '#2e7d32', bg: 'rgba(46,125,50,0.06)',  badge: 'rgba(46,125,50,0.12)',  text: '#1b5e20' },
  academic:  { border: '#C62828', bg: 'rgba(198,40,40,0.06)',  badge: 'rgba(198,40,40,0.12)',  text: '#B71C1C' },
  workshop:  { border: '#e65100', bg: 'rgba(230,81,0,0.06)',   badge: 'rgba(230,81,0,0.12)',   text: '#bf360c' },
  seminar:   { border: '#6a1b9a', bg: 'rgba(106,27,154,0.06)', badge: 'rgba(106,27,154,0.12)', text: '#4a148c' },
  general:   { border: '#37474f', bg: 'rgba(55,71,79,0.05)',   badge: 'rgba(55,71,79,0.1)',    text: '#263238' },
};

const FILE_ICONS: Record<string, string> = { pdf: '📄', image: '🖼️', doc: '📝', ppt: '📊', other: '📎' };

const fmtDate  = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime  = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const timeAgo  = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };
const upcoming = (d: string) => new Date(d) > new Date();

// ─── Page ─────────────────────────────────────────────────────────
export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('all');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent]   = useState<Event | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const load = useCallback(async (cat: string, q: string, pg: number) => {
    setLoading(true);
    try {
      const res = await eventApi.list({ category: cat, search: q || undefined, page: pg, limit: 12 });
      if (res.success) { setEvents(res.data.events); setTotal(res.data.pagination.total); setTotalPages(res.data.pagination.totalPages); }
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(category, search, page); }, [category, search, page, load]);

  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const handleCat = (k: string) => { setCategory(k); setPage(1); };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await eventApi.delete(id);
      toast.success('Event deleted');
      setDetailEvent(null);
      load(category, search, page);
    } catch { toast.error('Failed to delete'); }
  };

  const openDetail = async (ev: Event) => {
    try {
      const res = await eventApi.getById(ev.id);
      setDetailEvent(res.success ? res.data : ev);
    } catch { setDetailEvent(ev); }
  };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', objectFit: 'contain' }} />
          <h2>Campus Events</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>
            {user.role === 'student' ? '🎓' : user.role === 'faculty' ? '👨‍🏫' : '🛠️'} {user.role}
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => { setEditEvent(null); setShowCreate(true); }}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '14px', padding: '6px 16px' }}
          >
            + New Event
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ paddingTop: '24px' }}>

        {/* ── Info Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(198,40,40,0.08), rgba(79,195,247,0.06))',
          border: '1px solid rgba(198,40,40,0.18)', borderRadius: '14px',
          padding: '18px 24px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '42px' }}>🎉</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--color-header-bg)', marginBottom: '3px' }}>
              BBDU Campus Events Board
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Faculty, student clubs, and departments can post events, workshops, fests & seminars here.
            </div>
          </div>
          {total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-header-bg)' }}>{total}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>events listed</div>
            </div>
          )}
        </div>

        {/* ── Filter + Search row ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', opacity: 0.5 }}>🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '14px', padding: '9px 12px 9px 36px' }}
              placeholder="Search events, clubs, venues…"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => handleCat(cat.key)}
                style={{
                  padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap',
                  background: category === cat.key ? 'var(--color-header-bg)' : '#fff',
                  color: category === cat.key ? '#fff' : 'var(--color-text-secondary)',
                  border: category === cat.key ? '1px solid var(--color-header-bg)' : '1px solid rgba(0,0,0,0.18)',
                  boxShadow: category === cat.key ? '0 2px 8px rgba(198,40,40,0.25)' : 'none',
                  transition: 'all 0.18s',
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Events List ── */}
        {loading ? (
          <LoadingSkeleton />
        ) : events.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {events.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  onView={() => openDetail(ev)}
                  onEdit={() => { setEditEvent(ev); setShowCreate(true); }}
                  onDelete={() => handleDelete(ev.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
                <button className="btn btn-ghost" style={{ padding: '8px 18px', fontSize: '14px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost" style={{ padding: '8px 18px', fontSize: '14px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modals ── */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          currentUserId={user.id}
          currentUserRole={user.role}
          onClose={() => setDetailEvent(null)}
          onEdit={() => { setEditEvent(detailEvent); setDetailEvent(null); setShowCreate(true); }}
          onDelete={() => handleDelete(detailEvent.id)}
          onFileUploaded={() => openDetail(detailEvent)}
        />
      )}

      {showCreate && (
        <CreateEventDrawer
          existingEvent={editEvent}
          onClose={() => { setShowCreate(false); setEditEvent(null); }}
          onSaved={() => { setShowCreate(false); setEditEvent(null); load(category, search, page); }}
        />
      )}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────
function EventCard({ event, currentUserId, currentUserRole, onView, onEdit, onDelete }: {
  event: Event; currentUserId: string; currentUserRole: string;
  onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const c = CAT_COLOR[event.category] || CAT_COLOR.general;
  const canManage = currentUserRole === 'admin' || event.authorId === currentUserId;
  const isUp = upcoming(event.eventDate);

  return (
    <div style={{
      background: '#fff', border: '2px solid #000', borderLeft: `5px solid ${c.border}`,
      borderRadius: '14px', overflow: 'hidden', transition: 'transform 0.18s, box-shadow 0.18s',
    }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
    >
      {/* Top strip */}
      <div style={{ background: c.bg, padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: c.badge, color: c.text, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {CATEGORIES.find(x => x.key === event.category)?.icon} {event.category}
          </span>
          <span style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--color-text-secondary)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>
            {event.organizerType === 'club' ? '🏛️ Club' : event.organizerType === 'faculty' ? '👨‍🏫 Faculty' : event.organizerType === 'admin' ? '🛠️ Admin' : '🏢 Dept'}
          </span>
          {isUp ? (
            <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#16a34a', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
              🟢 Upcoming
            </span>
          ) : (
            <span style={{ background: 'rgba(0,0,0,0.05)', color: '#888', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>
              ✓ Concluded
            </span>
          )}
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
          {timeAgo(event.createdAt)} · {event.author.fullName}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px' }}>
        <h3 onClick={onView} style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 900, color: 'var(--color-text-primary)', lineHeight: 1.3, cursor: 'pointer' }}>
          {event.title}
        </h3>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
          <MetaItem icon="📅" label={`${fmtDate(event.eventDate)} · ${fmtTime(event.eventDate)}`} />
          {event.endDate && <MetaItem icon="🏁" label={`Ends ${fmtDate(event.endDate)}`} />}
          <MetaItem icon="📍" label={event.venue} />
          {event.maxParticipants && <MetaItem icon="👥" label={`${event.maxParticipants} seats`} />}
        </div>

        {/* Description */}
        <p style={{ margin: '0 0 14px', color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.description}
        </p>

        {/* Organiser + Faculty row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 14px', background: '#f8f9fb', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Organiser</div>
            <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>{event.organizerName}</div>
            {event.clubName && event.clubName !== event.organizerName && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>🏛️ {event.clubName}</div>}
            {event.clubContact && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>📞 {event.clubContact}</div>}
          </div>
          {event.facultyName && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Faculty In-Charge</div>
              <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>👨‍🏫 {event.facultyName}</div>
              {event.facultyPhone && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>📞 {event.facultyPhone}</div>}
              {event.facultyEmail && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>✉️ {event.facultyEmail}</div>}
            </div>
          )}
        </div>

        {/* File chips */}
        {event.files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {event.files.map(f => (
              <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(198,40,40,0.07)', border: '1px solid rgba(198,40,40,0.2)', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', color: 'var(--color-header-bg)' }}>
                {FILE_ICONS[f.fileType] || '📎'} {f.fileName}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={onView} style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--color-header-bg)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            View Details →
          </button>
          {event.registrationLink && (
            <a href={event.registrationLink} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
              🔗 Register
            </a>
          )}
          {event.tags && event.tags.split(',').filter(Boolean).map(tag => (
            <span key={tag} style={{ padding: '4px 10px', background: '#f0f2f5', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '20px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              #{tag.trim()}
            </span>
          ))}
          {canManage && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={onEdit} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>✏️ Edit</button>
              <button onClick={onDelete} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>🗑️ Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MetaItem ─────────────────────────────────────────────────────
function MetaItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
      <span>{icon}</span><span>{label}</span>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────
function EventDetailModal({ event, currentUserId, currentUserRole, onClose, onEdit, onDelete, onFileUploaded }: {
  event: Event; currentUserId: string; currentUserRole: string;
  onClose: () => void; onEdit: () => void; onDelete: () => void; onFileUploaded: () => void;
}) {
  const c = CAT_COLOR[event.category] || CAT_COLOR.general;
  const canManage = currentUserRole === 'admin' || event.authorId === currentUserId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const downloadFile = async (f: EventFile) => {
    try {
      const res = await eventApi.downloadFile(event.id, f.id);
      if (!res.success) { toast.error('Download failed'); return; }
      const { fileName, fileBase64, fileType } = res.data;
      const mimeMap: Record<string, string> = { pdf: 'application/pdf', image: 'image/jpeg', doc: 'application/msword', ppt: 'application/vnd.ms-powerpoint', other: 'application/octet-stream' };
      const mime = mimeMap[fileType] || 'application/octet-stream';
      const b64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const typeMap: Record<string, string> = { pdf: 'pdf', jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', doc: 'doc', docx: 'doc', ppt: 'ppt', pptx: 'ppt' };
      const res = await eventApi.addFile(event.id, { fileName: file.name, fileBase64: base64, fileType: typeMap[ext] || 'other', fileSizeKb: Math.round(file.size / 1024) });
      if (res.success) { toast.success('File attached!'); onFileUploaded(); }
      else toast.error('Failed to attach file');
      setUploading(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;
    try { await eventApi.deleteFile(event.id, fileId); toast.success('File removed'); onFileUploaded(); }
    catch { toast.error('Failed to delete file'); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '2px solid #000', borderTop: `5px solid ${c.border}`, borderRadius: '16px', width: '100%', maxWidth: '780px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Modal Header */}
        <div style={{ background: c.bg, padding: '22px 26px', borderBottom: `1px solid ${c.border}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ background: c.badge, color: c.text, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                {CATEGORIES.find(x => x.key === event.category)?.icon} {event.category}
              </span>
              {upcoming(event.eventDate)
                ? <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#16a34a', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>🟢 Upcoming</span>
                : <span style={{ background: '#f0f2f5', color: '#888', borderRadius: '20px', padding: '3px 10px', fontSize: '11px' }}>✓ Concluded</span>
              }
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{event.title}</h2>
            <div style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Posted by <strong style={{ color: 'var(--color-text-secondary)' }}>{event.author.fullName}</strong> · {timeAgo(event.createdAt)}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: '16px', marginLeft: '14px', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '24px 26px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Key info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '22px' }}>
            {[
              { icon: '📅', label: 'Date & Time', value: `${fmtDate(event.eventDate)} · ${fmtTime(event.eventDate)}` },
              ...(event.endDate ? [{ icon: '🏁', label: 'End Date', value: fmtDate(event.endDate) }] : []),
              { icon: '📍', label: 'Venue', value: event.venue },
              ...(event.maxParticipants ? [{ icon: '👥', label: 'Capacity', value: `${event.maxParticipants} participants` }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{icon} {label}</div>
                <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <SectionTitle>About the Event</SectionTitle>
          <p style={{ margin: '0 0 22px', color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>

          {/* Contacts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '22px' }}>
            <ContactBlock title="Organiser" name={event.organizerName} sub={event.clubName && event.clubName !== event.organizerName ? `🏛️ ${event.clubName}` : undefined} phone={event.clubContact} />
            {event.facultyName && <ContactBlock title="Faculty In-Charge" name={`👨‍🏫 ${event.facultyName}`} phone={event.facultyPhone} email={event.facultyEmail} />}
          </div>

          {/* Registration */}
          {event.registrationLink && (
            <div style={{ marginBottom: '22px' }}>
              <SectionTitle>Registration</SectionTitle>
              <a href={event.registrationLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', color: '#16a34a', fontWeight: 700, textDecoration: 'none', fontSize: '14px' }}>
                🔗 Register / Apply Now
              </a>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.split(',').filter(Boolean).length > 0 && (
            <div style={{ marginBottom: '22px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {event.tags.split(',').filter(Boolean).map(tag => (
                <span key={tag} style={{ padding: '5px 12px', background: '#f0f2f5', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '20px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Attachments */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <SectionTitle>Attachments ({event.files?.length || 0})</SectionTitle>
              {canManage && (
                <>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(198,40,40,0.08)', color: 'var(--color-header-bg)', border: '1px solid rgba(198,40,40,0.2)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                    {uploading ? '⏳ Uploading…' : '+ Add File'}
                  </button>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx" onChange={handleFileUpload} />
                </>
              )}
            </div>
            {(event.files?.length || 0) === 0
              ? <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '16px', background: '#f8f9fb', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>No attachments yet.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {event.files?.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{FILE_ICONS[f.fileType] || '📎'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px' }}>{f.fileName}</div>
                        {f.fileSizeKb && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{f.fileSizeKb} KB · {f.fileType.toUpperCase()}</div>}
                      </div>
                      <button onClick={() => downloadFile(f)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--color-header-bg)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                        ⬇ Download
                      </button>
                      {canManage && (
                        <button onClick={() => deleteFile(f.id)} style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.18)', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        {canManage && (
          <div style={{ padding: '14px 26px', borderTop: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fb', display: 'flex', gap: '10px' }}>
            <button onClick={onEdit} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>✏️ Edit Event</button>
            <button onClick={onDelete} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>🗑️ Delete Event</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Drawer ─────────────────────────────────────────
function CreateEventDrawer({ existingEvent, onClose, onSaved }: {
  existingEvent: Event | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!existingEvent;
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ name: string; base64: string; type: string; sizeKb: number }[]>([]);

  const toLocalDT = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso), p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    title: existingEvent?.title || '', description: existingEvent?.description || '',
    venue: existingEvent?.venue || '', eventDate: toLocalDT(existingEvent?.eventDate) || '',
    endDate: toLocalDT(existingEvent?.endDate) || '', category: existingEvent?.category || 'general',
    organizerType: existingEvent?.organizerType || 'club', organizerName: existingEvent?.organizerName || '',
    clubName: existingEvent?.clubName || '', clubContact: existingEvent?.clubContact || '',
    facultyName: existingEvent?.facultyName || '', facultyPhone: existingEvent?.facultyPhone || '',
    facultyEmail: existingEvent?.facultyEmail || '', registrationLink: existingEvent?.registrationLink || '',
    maxParticipants: existingEvent?.maxParticipants ? String(existingEvent.maxParticipants) : '',
    tags: existingEvent?.tags || '', isPublished: existingEvent?.isPublished ?? true,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const typeMap: Record<string, string> = { pdf: 'pdf', jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', doc: 'doc', docx: 'doc', ppt: 'ppt', pptx: 'ppt' };
      setPendingFiles(pf => [...pf, { name: file.name, base64, type: typeMap[ext] || 'other', sizeKb: Math.round(file.size / 1024) }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.venue.trim() || !form.eventDate || !form.organizerName.trim()) {
      toast.error('Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, eventDate: new Date(form.eventDate).toISOString(), endDate: form.endDate ? new Date(form.endDate).toISOString() : null, maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : null, facultyEmail: form.facultyEmail || null, registrationLink: form.registrationLink || null };
      let eventId: string;
      if (isEdit) {
        const res = await eventApi.update(existingEvent!.id, payload);
        if (!res.success) { toast.error(res.message || 'Update failed'); setSaving(false); return; }
        eventId = existingEvent!.id; toast.success('Event updated!');
      } else {
        const res = await eventApi.create(payload);
        if (!res.success) { toast.error(res.message || 'Create failed'); setSaving(false); return; }
        eventId = res.data.id; toast.success('Event published!');
      }
      for (const pf of pendingFiles) await eventApi.addFile(eventId, { fileName: pf.name, fileBase64: pf.base64, fileType: pf.type, fileSizeKb: pf.sizeKb });
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'Failed to save event'); }
    setSaving(false);
  };

  const iStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' };
  const fStyle: React.CSSProperties = { marginBottom: '16px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '560px', background: '#fff', border: '2px solid #000', borderRight: 'none', height: '100%', overflowY: 'auto', boxShadow: '-12px 0 60px rgba(0,0,0,0.2)' }}>
        {/* Drawer Header */}
        <div style={{ padding: '20px 24px', background: 'var(--color-header-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fff' }}>{isEdit ? '✏️ Edit Event' : '🎉 Create Event'}</h2>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{isEdit ? 'Update event details' : 'Share with the campus community'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '15px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          <div style={fStyle}><label style={lStyle}>Event Title *</label><input style={iStyle} required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. IEEE HackBlitz 2026" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={lStyle}>Category *</label><select style={iStyle} value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}</select></div>
            <div><label style={lStyle}>Organiser Type *</label><select style={iStyle} value={form.organizerType} onChange={e => set('organizerType', e.target.value)}><option value="club">🏛️ Student Club</option><option value="faculty">👨‍🏫 Faculty</option><option value="department">🏢 Department</option><option value="admin">🛠️ Admin / University</option></select></div>
          </div>
          <div style={fStyle}><label style={lStyle}>Organiser Name *</label><input style={iStyle} required value={form.organizerName} onChange={e => set('organizerName', e.target.value)} placeholder="e.g. IEEE BBDU Student Branch" /></div>
          <div style={fStyle}><label style={lStyle}>Description *</label><textarea style={{ ...iStyle, resize: 'vertical', lineHeight: 1.65 }} required value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe the event…" /></div>
          <div style={fStyle}><label style={lStyle}>Venue *</label><input style={iStyle} required value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. CS Seminar Hall, Block B" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={lStyle}>Start Date & Time *</label><input type="datetime-local" style={iStyle} required value={form.eventDate} onChange={e => set('eventDate', e.target.value)} /></div>
            <div><label style={lStyle}>End Date & Time</label><input type="datetime-local" style={iStyle} value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
          </div>

          {/* Club / Faculty sections */}
          <div style={{ padding: '14px', background: '#f8f9fb', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>🏛️ Club / Department Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={lStyle}>Club / Dept Name</label><input style={iStyle} value={form.clubName} onChange={e => set('clubName', e.target.value)} placeholder="e.g. IEEE BBDU" /></div>
              <div><label style={lStyle}>Club Contact</label><input style={iStyle} value={form.clubContact} onChange={e => set('clubContact', e.target.value)} placeholder="+91 XXXX XXXXXX" /></div>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#f8f9fb', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>👨‍🏫 Faculty In-Charge</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div><label style={lStyle}>Faculty Name</label><input style={iStyle} value={form.facultyName} onChange={e => set('facultyName', e.target.value)} placeholder="e.g. Dr. Amit Verma" /></div>
              <div><label style={lStyle}>Faculty Phone</label><input style={iStyle} value={form.facultyPhone} onChange={e => set('facultyPhone', e.target.value)} placeholder="+91 XXXX XXXXXX" /></div>
            </div>
            <div><label style={lStyle}>Faculty Email</label><input type="email" style={iStyle} value={form.facultyEmail} onChange={e => set('facultyEmail', e.target.value)} placeholder="faculty@bbdu.ac.in" /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={lStyle}>Registration Link</label><input type="url" style={iStyle} value={form.registrationLink} onChange={e => set('registrationLink', e.target.value)} placeholder="https://forms.gle/..." /></div>
            <div><label style={lStyle}>Max Participants</label><input type="number" min="1" style={iStyle} value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} placeholder="e.g. 150" /></div>
          </div>

          <div style={fStyle}><label style={lStyle}>Tags (comma-separated)</label><input style={iStyle} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="hackathon, prizes, coding" /></div>

          {/* File upload */}
          <div style={fStyle}>
            <label style={lStyle}>Attachments (PDF, images, docs)</label>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...iStyle, cursor: 'pointer', border: '2px dashed rgba(198,40,40,0.3)', color: 'var(--color-header-bg)', textAlign: 'center', background: 'rgba(198,40,40,0.03)', fontWeight: 700 }}>📎 Click to add file</button>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx" onChange={addFile} />
            {pendingFiles.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pendingFiles.map((pf, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(198,40,40,0.05)', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(198,40,40,0.15)' }}>
                    <span>{FILE_ICONS[pf.type] || '📎'}</span>
                    <span style={{ flex: 1, color: 'var(--color-text-primary)', fontWeight: 600 }}>{pf.name}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{pf.sizeKb} KB</span>
                    <button type="button" onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', padding: '12px 14px', background: '#f8f9fb', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.09)' }}>
            <input type="checkbox" id="pub" checked={form.isPublished} onChange={e => set('isPublished', e.target.checked)} style={{ width: '17px', height: '17px', accentColor: 'var(--color-header-bg)' }} />
            <label htmlFor="pub" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Publish immediately — visible to all users</label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, var(--color-header-bg), var(--color-header-accent))', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving…' : isEdit ? '✓ Update Event' : '🎉 Publish Event'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: '12px 20px' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{children}</h4>;
}

function ContactBlock({ title, name, sub, phone, email }: { title: string; name: string; sub?: string; phone?: string | null; email?: string | null }) {
  return (
    <div style={{ padding: '14px', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '10px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '7px' }}>{title}</div>
      <div style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontSize: '15px', marginBottom: '4px' }}>{name}</div>
      {sub   && <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '3px' }}>{sub}</div>}
      {phone && <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>📞 {phone}</div>}
      {email && <a href={`mailto:${email}`} style={{ color: 'var(--color-header-bg)', fontSize: '13px', textDecoration: 'none' }}>✉️ {email}</a>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: '#fff', border: '2px solid #e5e7eb', borderLeft: '5px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ height: '48px', background: '#f0f2f5' }} />
          <div style={{ padding: '18px 20px' }}>
            <div style={{ height: '22px', width: '55%', background: '#e5e7eb', borderRadius: '4px', marginBottom: '12px' }} />
            <div style={{ height: '14px', width: '85%', background: '#f0f2f5', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ height: '14px', width: '70%', background: '#f0f2f5', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', border: '2px solid #000', borderRadius: '16px' }}>
      <div style={{ fontSize: '64px', marginBottom: '14px' }}>🎭</div>
      <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>No Events Yet</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: '0 0 26px', maxWidth: '360px', lineHeight: 1.6, marginLeft: 'auto', marginRight: 'auto' }}>
        Be the first to post an event — share upcoming fests, workshops, seminars, or club activities.
      </p>
      <button onClick={onCreate} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, var(--color-header-bg), var(--color-header-accent))', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(198,40,40,0.3)' }}>
        🎉 Create First Event
      </button>
    </div>
  );
}
