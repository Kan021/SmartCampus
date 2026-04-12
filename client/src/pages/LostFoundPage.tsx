import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lostFoundApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

// ─── Types ────────────────────────────────────────────────────────
interface LFImage { id: string; caption?: string | null; createdAt: string; imageBase64?: string; }
interface LFItem {
  id: string; title: string; description: string; location: string;
  foundDate: string; category: string; status: string;
  contactName: string; contactPhone?: string | null; contactEmail?: string | null;
  reportedById: string; createdAt: string;
  reportedBy: { id: string; fullName: string; role: string };
  images: LFImage[];
}

// ─── Constants ────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',          label: 'All Items',    icon: '🔍' },
  { key: 'electronics',  label: 'Electronics',  icon: '📱' },
  { key: 'bags',         label: 'Bags',         icon: '🎒' },
  { key: 'clothing',     label: 'Clothing',     icon: '👕' },
  { key: 'accessories',  label: 'Accessories',  icon: '⌚' },
  { key: 'documents',    label: 'Documents',    icon: '📄' },
  { key: 'keys',         label: 'Keys',         icon: '🔑' },
  { key: 'wallet',       label: 'Wallet',       icon: '👛' },
  { key: 'sports',       label: 'Sports',       icon: '⚽' },
  { key: 'other',        label: 'Other',        icon: '📦' },
];

const CAT_COLOR: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  electronics: { border: '#1565C0', bg: 'rgba(21,101,192,0.05)', badge: 'rgba(21,101,192,0.12)', text: '#1565C0' },
  bags:        { border: '#6a1b9a', bg: 'rgba(106,27,154,0.05)', badge: 'rgba(106,27,154,0.12)', text: '#4a148c' },
  clothing:    { border: '#e91e8c', bg: 'rgba(233,30,140,0.05)', badge: 'rgba(233,30,140,0.12)', text: '#c2185b' },
  accessories: { border: '#e65100', bg: 'rgba(230,81,0,0.05)',   badge: 'rgba(230,81,0,0.12)',   text: '#bf360c' },
  documents:   { border: '#C62828', bg: 'rgba(198,40,40,0.05)',  badge: 'rgba(198,40,40,0.12)',  text: '#B71C1C' },
  keys:        { border: '#2e7d32', bg: 'rgba(46,125,50,0.05)',  badge: 'rgba(46,125,50,0.12)',  text: '#1b5e20' },
  wallet:      { border: '#f9a825', bg: 'rgba(249,168,37,0.05)', badge: 'rgba(249,168,37,0.12)', text: '#f57f17' },
  sports:      { border: '#00796b', bg: 'rgba(0,121,107,0.05)',  badge: 'rgba(0,121,107,0.12)',  text: '#004d40' },
  other:       { border: '#546e7a', bg: 'rgba(84,110,122,0.05)', badge: 'rgba(84,110,122,0.12)', text: '#37474f' },
};

const fmtDate  = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeAgo  = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };

// ─── Page ─────────────────────────────────────────────────────────
export default function LostFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems]       = useState<LFItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('all');
  const [status, setStatus]     = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detail, setDetail]     = useState<LFItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<LFItem | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const load = useCallback(async (cat: string, st: string, q: string, pg: number) => {
    setLoading(true);
    try {
      const res = await lostFoundApi.list({ category: cat, status: st, search: q || undefined, page: pg, limit: 12 });
      if (res.success) { setItems(res.data.items); setTotal(res.data.pagination.total); setTotalPages(res.data.pagination.totalPages); }
    } catch { toast.error('Failed to load items'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(category, status, search, page); }, [category, status, search, page, load]);

  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const openDetail = async (item: LFItem) => {
    try {
      const res = await lostFoundApi.getById(item.id);
      setDetail(res.success ? res.data : item);
    } catch { setDetail(item); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    try { await lostFoundApi.delete(id); toast.success('Report deleted'); setDetail(null); load(category, status, search, page); }
    catch { toast.error('Failed to delete'); }
  };

  const handleClaim = async (id: string) => {
    if (!confirm('Mark this item as claimed? (Owner has been returned the item)')) return;
    try {
      const res = await lostFoundApi.claim(id);
      if (res.success) { toast.success('Marked as claimed! 🎉'); openDetail(res.data); load(category, status, search, page); }
    } catch { toast.error('Failed to update status'); }
  };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', objectFit: 'contain' }} />
          <h2>Lost &amp; Found</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>
            {user.role === 'student' ? '🎓' : user.role === 'faculty' ? '👨‍🏫' : '🛠️'} {user.role}
          </span>
          <button onClick={() => { setEditItem(null); setShowCreate(true); }}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '6px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            + Report Found Item
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ paddingTop: '24px' }}>
        {/* Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(198,40,40,0.07), rgba(249,168,37,0.05))', border: '1px solid rgba(198,40,40,0.15)', borderRadius: '14px', padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '44px' }}>🔍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--color-header-bg)', marginBottom: '3px' }}>BBDU Lost &amp; Found Board</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Found something on campus? Post it here. If you've lost something, browse the listings and contact the finder directly.</div>
          </div>
          {total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-header-bg)' }}>{total}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>items reported</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', opacity: 0.4 }}>🔍</span>
            <input className="form-input" style={{ paddingLeft: '36px', fontSize: '14px' }} placeholder="Search items, locations…" value={searchInput} onChange={e => handleSearch(e.target.value)} />
          </div>
          {/* Status */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ k: 'all', l: 'All' }, { k: 'found', l: '🟢 Available' }, { k: 'claimed', l: '✓ Claimed' }].map(s => (
              <button key={s.k} onClick={() => { setStatus(s.k); setPage(1); }} style={{ padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: status === s.k ? 'var(--color-header-bg)' : '#fff', color: status === s.k ? '#fff' : 'var(--color-text-secondary)', border: status === s.k ? '1px solid var(--color-header-bg)' : '1px solid rgba(0,0,0,0.18)', transition: 'all 0.18s' }}>{s.l}</button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => { setCategory(cat.key); setPage(1); }} style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', background: category === cat.key ? 'var(--color-header-bg)' : '#fff', color: category === cat.key ? '#fff' : 'var(--color-text-secondary)', border: category === cat.key ? '1px solid var(--color-header-bg)' : '1px solid rgba(0,0,0,0.18)', transition: 'all 0.18s' }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? <LoadingSkeleton /> : items.length === 0 ? <EmptyState onCreate={() => setShowCreate(true)} /> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {items.map(item => (
                <ItemCard key={item.id} item={item} currentUserId={user.id} currentUserRole={user.role}
                  onView={() => openDetail(item)} onEdit={() => { setEditItem(item); setShowCreate(true); }}
                  onDelete={() => handleDelete(item.id)} onClaim={() => handleClaim(item.id)} />
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '28px' }}>
                <button className="btn btn-ghost" style={{ padding: '8px 18px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '36px' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost" style={{ padding: '8px 18px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </main>

      {detail && (
        <DetailModal item={detail} currentUserId={user.id} currentUserRole={user.role}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditItem(detail); setDetail(null); setShowCreate(true); }}
          onDelete={() => handleDelete(detail.id)}
          onClaim={() => handleClaim(detail.id)}
          onRefresh={() => openDetail(detail)} />
      )}
      {showCreate && (
        <CreateDrawer existingItem={editItem} onClose={() => { setShowCreate(false); setEditItem(null); }}
          onSaved={() => { setShowCreate(false); setEditItem(null); load(category, status, search, page); }} />
      )}
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────
function ItemCard({ item, currentUserId, currentUserRole, onView, onEdit, onDelete, onClaim }: {
  item: LFItem; currentUserId: string; currentUserRole: string;
  onView: () => void; onEdit: () => void; onDelete: () => void; onClaim: () => void;
}) {
  const c = CAT_COLOR[item.category] || CAT_COLOR.other;
  const cat = CATEGORIES.find(x => x.key === item.category);
  const canManage = currentUserRole === 'admin' || item.reportedById === currentUserId;
  const isClaimed = item.status === 'claimed';
  const firstImg  = item.images?.[0];

  return (
    <div style={{ background: '#fff', border: '2px solid #000', borderTop: `4px solid ${c.border}`, borderRadius: '14px', overflow: 'hidden', transition: 'transform 0.18s, box-shadow 0.18s', opacity: isClaimed ? 0.75 : 1 }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 32px rgba(0,0,0,0.1)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>

      {/* Image */}
      {firstImg && firstImg.imageBase64 ? (
        <div onClick={onView} style={{ height: '180px', overflow: 'hidden', cursor: 'pointer', background: '#f0f2f5' }}>
          <img src={firstImg.imageBase64} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseOut={e  => (e.currentTarget.style.transform = '')} />
        </div>
      ) : (
        <div onClick={onView} style={{ height: '100px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', cursor: 'pointer' }}>{cat?.icon || '📦'}</div>
      )}

      <div style={{ padding: '14px 16px' }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ background: c.badge, color: c.text, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{cat?.icon} {item.category}</span>
          {isClaimed
            ? <span style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>✓ Claimed</span>
            : <span style={{ background: 'rgba(249,168,37,0.12)', color: '#d97706', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>🟡 Available</span>
          }
          {item.images.length > 0 && <span style={{ background: '#f0f2f5', color: '#666', borderRadius: '20px', padding: '2px 8px', fontSize: '11px' }}>📷 {item.images.length}</span>}
        </div>

        <h3 onClick={onView} style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 900, color: 'var(--color-text-primary)', cursor: 'pointer', lineHeight: 1.3 }}>{item.title}</h3>
        <p style={{ margin: '0 0 10px', color: 'var(--color-text-muted)', fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>{item.description}</p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          <span>📍 {item.location}</span>
          <span>📅 {fmtDate(item.foundDate)}</span>
        </div>

        <div style={{ padding: '10px 12px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Finder Contact</div>
          <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13px' }}>{item.contactName}</div>
          {item.contactPhone && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>📞 {item.contactPhone}</div>}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={onView} style={{ flex: 1, padding: '7px 0', background: 'var(--color-header-bg)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>View Details →</button>
          {canManage && !isClaimed && (
            <button onClick={onClaim} style={{ padding: '7px 12px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>✓ Claimed</button>
          )}
          {canManage && (
            <>
              <button onClick={onEdit} style={{ padding: '7px 10px', background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
              <button onClick={onDelete} style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
            </>
          )}
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Reported {timeAgo(item.createdAt)} by {item.reportedBy.fullName}</div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────
function DetailModal({ item, currentUserId, currentUserRole, onClose, onEdit, onDelete, onClaim, onRefresh }: {
  item: LFItem; currentUserId: string; currentUserRole: string;
  onClose: () => void; onEdit: () => void; onDelete: () => void; onClaim: () => void; onRefresh: () => void;
}) {
  const c = CAT_COLOR[item.category] || CAT_COLOR.other;
  const cat = CATEGORIES.find(x => x.key === item.category);
  const canManage = currentUserRole === 'admin' || item.reportedById === currentUserId;
  const isClaimed = item.status === 'claimed';
  const [activeImg, setActiveImg] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);

  const handleUploadImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const res = await lostFoundApi.addImage(item.id, { imageBase64: base64 });
      if (res.success) { toast.success('Photo added!'); onRefresh(); }
      else toast.error('Failed to add photo');
      setUploading(false);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const imgs = item.images || [];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '2px solid #000', borderTop: `5px solid ${c.border}`, borderRadius: '16px', width: '100%', maxWidth: '720px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: c.bg, padding: '20px 24px', borderBottom: `1px solid ${c.border}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: c.badge, color: c.text, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{cat?.icon} {item.category}</span>
              {isClaimed
                ? <span style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>✓ Claimed / Returned</span>
                : <span style={{ background: 'rgba(249,168,37,0.12)', color: '#d97706', border: '1px solid rgba(249,168,37,0.25)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>🟡 Still Available</span>}
            </div>
            <h2 style={{ margin: 0, fontSize: '21px', fontWeight: 900, color: 'var(--color-text-primary)' }}>{item.title}</h2>
            <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Reported by <strong>{item.reportedBy.fullName}</strong> · {timeAgo(item.createdAt)}</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '7px 12px', marginLeft: '14px', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '22px 24px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Photo gallery */}
          {imgs.length > 0 && (
            <div style={{ marginBottom: '22px' }}>
              <div style={{ height: '260px', background: '#f0f2f5', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px', border: '1px solid rgba(0,0,0,0.1)', position: 'relative' }}>
                {imgs[activeImg]?.imageBase64 && <img src={imgs[activeImg].imageBase64} alt={`Photo ${activeImg + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                {imgs.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg(i => (i - 1 + imgs.length) % imgs.length)} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                    <button onClick={() => setActiveImg(i => (i + 1) % imgs.length)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>›</button>
                  </>
                )}
              </div>
              {imgs.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {imgs.map((img, i) => (
                    <div key={img.id} onClick={() => setActiveImg(i)} style={{ width: '56px', height: '56px', flexShrink: 0, border: `2px solid ${i === activeImg ? c.border : 'rgba(0,0,0,0.12)'}`, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: '#f0f2f5' }}>
                      {img.imageBase64 && <img src={img.imageBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  ))}
                </div>
              )}
              {canManage && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '6px 14px', background: 'rgba(198,40,40,0.08)', color: 'var(--color-header-bg)', border: '1px solid rgba(198,40,40,0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>{uploading ? '⏳' : '+ Add Photo'}</button>
                  {imgs[activeImg] && <button onClick={() => { lostFoundApi.deleteImage(item.id, imgs[activeImg].id).then(() => { toast.success('Photo removed'); onRefresh(); }); }} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🗑 Remove</button>}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadImg} />
                </div>
              )}
            </div>
          )}

          {imgs.length === 0 && canManage && (
            <div style={{ marginBottom: '18px' }}>
              <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '20px', border: '2px dashed rgba(198,40,40,0.3)', borderRadius: '12px', background: 'rgba(198,40,40,0.03)', color: 'var(--color-header-bg)', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>📷 Add Photos</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadImg} />
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <InfoBox icon="📍" label="Found At" value={item.location} />
            <InfoBox icon="📅" label="Date Found" value={fmtDate(item.foundDate)} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Description</div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.75, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{item.description}</p>
          </div>

          {/* Contact */}
          <div style={{ padding: '16px', background: '#f8f9fb', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.09)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>📞 Contact the Finder</div>
            <div style={{ fontWeight: 900, fontSize: '17px', color: 'var(--color-text-primary)', marginBottom: '6px' }}>{item.contactName}</div>
            {item.contactPhone && <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>📞 {item.contactPhone}</div>}
            {item.contactEmail && <a href={`mailto:${item.contactEmail}`} style={{ fontSize: '14px', color: 'var(--color-header-bg)', textDecoration: 'none' }}>✉️ {item.contactEmail}</a>}
            {!isClaimed && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>If this item belongs to you, reach out to the finder directly using the contact above.</div>}
          </div>
        </div>

        {canManage && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fb', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!isClaimed && <button onClick={onClaim} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>✓ Mark as Claimed</button>}
            <button onClick={onEdit} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>✏️ Edit</button>
            <button onClick={onDelete} style={{ padding: '8px 18px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>🗑️ Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Drawer ─────────────────────────────────────────
function CreateDrawer({ existingItem, onClose, onSaved }: { existingItem: LFItem | null; onClose: () => void; onSaved: () => void; }) {
  const isEdit = !!existingItem;
  const [saving, setSaving] = useState(false);
  const [pendingImgs, setPendingImgs] = useState<{ base64: string; caption: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const toLocalDate = (iso?: string) => { if (!iso) return ''; return new Date(iso).toISOString().substring(0, 10); };

  const [form, setForm] = useState({
    title:        existingItem?.title || '',
    description:  existingItem?.description || '',
    location:     existingItem?.location || '',
    foundDate:    toLocalDate(existingItem?.foundDate) || new Date().toISOString().substring(0, 10),
    category:     existingItem?.category || 'other',
    contactName:  existingItem?.contactName || '',
    contactPhone: existingItem?.contactPhone || '',
    contactEmail: existingItem?.contactEmail || '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);

  const addImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPendingImgs(p => [...p, { base64: ev.target?.result as string, caption: '' }]); };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.foundDate || !form.contactName.trim()) { toast.error('Fill in all required fields'); return; }
    setSaving(true);
    try {
      const payload = { ...form, foundDate: new Date(form.foundDate).toISOString(), contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined };
      let itemId: string;
      if (isEdit) {
        const res = await lostFoundApi.update(existingItem!.id, payload);
        if (!res.success) { toast.error(res.message || 'Update failed'); setSaving(false); return; }
        itemId = existingItem!.id; toast.success('Report updated!');
      } else {
        const res = await lostFoundApi.create({ ...payload, images: pendingImgs.map(p => ({ imageBase64: p.base64, caption: p.caption || undefined })) });
        if (!res.success) { toast.error(res.message || 'Create failed'); setSaving(false); return; }
        itemId = res.data.id; toast.success('Item reported! 🔍');
      }
      // For edit mode, upload any new images separately
      if (isEdit) { for (const pi of pendingImgs) await lostFoundApi.addImage(itemId, { imageBase64: pi.base64, caption: pi.caption || undefined }); }
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'Failed to save'); }
    setSaving(false);
  };

  const iStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' };
  const fStyle: React.CSSProperties = { marginBottom: '16px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-12px 0 60px rgba(0,0,0,0.2)', border: '2px solid #000', borderRight: 'none' }}>
        <div style={{ padding: '20px 24px', background: 'var(--color-header-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fff' }}>{isEdit ? '✏️ Edit Report' : '🔍 Report Found Item'}</h2>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Help reunite someone with their belongings</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '15px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          <div style={fStyle}><label style={lStyle}>Item Name / Title *</label><input style={iStyle} required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Black Wallet with ID cards" /></div>
          <div style={fStyle}><label style={lStyle}>Category *</label>
            <select style={iStyle} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div style={fStyle}><label style={lStyle}>Description *</label><textarea style={{ ...iStyle, resize: 'vertical' }} required rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the item in detail — colour, brand, markings, condition…" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label style={lStyle}>Where Found *</label><input style={iStyle} required value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. CS Block Corridor, 2nd Floor" /></div>
            <div><label style={lStyle}>Date Found *</label><input type="date" style={iStyle} required value={form.foundDate} onChange={e => set('foundDate', e.target.value)} /></div>
          </div>

          {/* Contact */}
          <div style={{ padding: '14px', background: '#f8f9fb', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>📞 Your Contact Details</div>
            <div style={{ marginBottom: '10px' }}><label style={lStyle}>Your Name *</label><input style={iStyle} required value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="How can the owner reach you?" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={lStyle}>Phone</label><input style={iStyle} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
              <div><label style={lStyle}>Email</label><input type="email" style={iStyle} value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="your@email.com" /></div>
            </div>
          </div>

          {/* Photos */}
          <div style={fStyle}>
            <label style={lStyle}>Photos (up to 5)</label>
            <button type="button" onClick={() => fileRef.current?.click()} style={{ ...iStyle, border: '2px dashed rgba(198,40,40,0.3)', color: 'var(--color-header-bg)', background: 'rgba(198,40,40,0.03)', textAlign: 'center', fontWeight: 700, cursor: 'pointer' }}>📷 Add Photo</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImg} />
            {pendingImgs.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {pendingImgs.map((pi, i) => (
                  <div key={i} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(198,40,40,0.2)' }}>
                    <img src={pi.base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setPendingImgs(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, var(--color-header-bg), var(--color-header-accent))', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving…' : isEdit ? '✓ Update Report' : '🔍 Submit Report'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: '12px 20px' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function InfoBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ padding: '12px 14px', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '10px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{icon} {label}</div>
      <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>{[1,2,3,4,5,6].map(i => (<div key={i} style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}><div style={{ height: '120px', background: '#f0f2f5' }} /><div style={{ padding: '14px' }}><div style={{ height: '18px', width: '70%', background: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} /><div style={{ height: '12px', width: '90%', background: '#f0f2f5', borderRadius: '4px' }} /></div></div>))}</div>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', border: '2px solid #000', borderRadius: '16px' }}>
      <div style={{ fontSize: '64px', marginBottom: '14px' }}>🔍</div>
      <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>Nothing Here Yet</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: '0 0 26px', maxWidth: '340px', lineHeight: 1.6, marginLeft: 'auto', marginRight: 'auto' }}>Found something on campus? Be a good samaritan — post it here so the owner can find it.</p>
      <button onClick={onCreate} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, var(--color-header-bg), var(--color-header-accent))', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(198,40,40,0.3)' }}>
        🔍 Report a Found Item
      </button>
    </div>
  );
}
