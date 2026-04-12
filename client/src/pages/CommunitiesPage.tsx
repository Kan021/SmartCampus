import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Community {
  id: string; name: string; description: string; type: string;
  logoBase64?: string; isRecruitmentActive: boolean; formUrl?: string;
  memberCount: number; foundedYear?: number; tags: string;
}

const TYPE_COLORS: Record<string, { bg: string; accent: string }> = {
  technical: { bg: 'linear-gradient(135deg, #1a237e, #283593)', accent: '#42a5f5' },
  cultural:  { bg: 'linear-gradient(135deg, #b71c1c, #c62828)', accent: '#ef9a9a' },
  social:    { bg: 'linear-gradient(135deg, #1b5e20, #2e7d32)', accent: '#81c784' },
  sports:    { bg: 'linear-gradient(135deg, #e65100, #ef6c00)', accent: '#ffb74d' },
};

const TYPE_ICONS: Record<string, string> = {
  technical: '⚡', cultural: '🎭', social: '🤝', sports: '🏆',
};

export default function CommunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'technical', isRecruitmentActive: false, formUrl: '', memberCount: 0, foundedYear: 2020, tags: '' });

  const isAdmin = user?.role === 'admin' || user?.role === 'faculty';

  const load = useCallback(async () => {
    try { const r = await communityApi.list(); if (r.data) setCommunities(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    try {
      if (editId) { await communityApi.update(editId, form); }
      else { await communityApi.create(form); }
      setShowForm(false); setEditId(null); setForm({ name: '', description: '', type: 'technical', isRecruitmentActive: false, formUrl: '', memberCount: 0, foundedYear: 2020, tags: '' });
      load();
    } catch {}
  };

  const startEdit = (c: Community) => {
    setForm({ name: c.name, description: c.description, type: c.type, isRecruitmentActive: c.isRecruitmentActive, formUrl: c.formUrl || '', memberCount: c.memberCount, foundedYear: c.foundedYear || 2020, tags: c.tags });
    setEditId(c.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => { if (confirm('Delete this community?')) { await communityApi.delete(id); load(); } };

  if (loading) return <div><header className="dashboard-header"><span style={{ color: '#fff', fontSize: '22px', fontWeight: 900 }}>🏛️ Communities</span></header><main className="dashboard-main"><div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div></main></div>;

  return (
    <div>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px' }}>🏛️ Campus Communities</span>
        </div>
        {isAdmin && <button onClick={() => { setEditId(null); setForm({ name: '', description: '', type: 'technical', isRecruitmentActive: false, formUrl: '', memberCount: 0, foundedYear: 2020, tags: '' }); setShowForm(true); }} style={{ padding: '8px 18px', borderRadius: '10px', background: '#fff', color: '#C62828', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>+ Add Community</button>}
      </header>

      <main className="dashboard-main" style={{ paddingTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {communities.length === 0 && <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px', fontSize: '16px' }}>No communities yet. {isAdmin && 'Click "+ Add Community" to get started.'}</div>}

        {communities.map(c => {
          const colors = TYPE_COLORS[c.type] || TYPE_COLORS.technical;
          const icon = TYPE_ICONS[c.type] || '📌';
          return (
            <div key={c.id} style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-3px)')} onMouseOut={e => (e.currentTarget.style.transform = 'none')}>
              {/* Header band */}
              <div style={{ background: colors.bg, padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{icon}</div>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 900, margin: '0 0 4px' }}>{c.name}</h2>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{c.type} Forum</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {c.isRecruitmentActive ? (
                    <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(76,175,80,0.25)', color: '#81c784', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>🟢 Recruitment Open</span>
                  ) : (
                    <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,82,82,0.2)', color: '#ef9a9a', fontSize: '12px', fontWeight: 800 }}>🔴 Closed</span>
                  )}
                </div>
              </div>
              {/* Body */}
              <div style={{ background: 'var(--color-card-bg, #fff)', padding: '24px 32px' }}>
                <p style={{ color: 'var(--color-text-secondary, #666)', fontSize: '14px', lineHeight: 1.7, margin: '0 0 20px' }}>{c.description}</p>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.foundedYear && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a8b8', fontSize: '13px' }}>📅 Founded {c.foundedYear}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a8b8', fontSize: '13px' }}>👥 {c.memberCount} Members</div>
                  {c.tags && c.tags.split(',').filter(Boolean).map(t => (
                    <span key={t} style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: colors.accent, fontSize: '11px', fontWeight: 700 }}>{t.trim()}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  {c.isRecruitmentActive && c.formUrl && (
                    <a href={c.formUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 24px', borderRadius: '10px', background: colors.bg, color: '#fff', fontWeight: 800, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>📝 Apply Now →</a>
                  )}
                  {c.isRecruitmentActive && !c.formUrl && (
                    <span style={{ padding: '10px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#636b7e', fontSize: '13px', fontWeight: 700 }}>📝 Application link coming soon</span>
                  )}
                  {isAdmin && <button onClick={() => startEdit(c)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#a0a8b8', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>✏️ Edit</button>}
                  {isAdmin && <button onClick={() => handleDelete(c.id)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,82,82,0.1)', color: '#ef5350', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>🗑️ Delete</button>}
                </div>
              </div>
            </div>
          );
        })}
       </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1d27', borderRadius: '18px', padding: '32px', width: '500px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: '#fff', margin: '0 0 20px', fontWeight: 900 }}>{editId ? 'Edit Community' : 'Add Community'}</h2>
            {[{ label: 'Name', key: 'name', type: 'text' }, { label: 'Description', key: 'description', type: 'textarea' }, { label: 'Google Form URL', key: 'formUrl', type: 'text' }, { label: 'Member Count', key: 'memberCount', type: 'number' }, { label: 'Founded Year', key: 'foundedYear', type: 'number' }, { label: 'Tags (comma-separated)', key: 'tags', type: 'text' }].map(f => (
              <div key={f.key} style={{ marginBottom: '14px' }}>
                <label style={{ color: '#a0a8b8', fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', minHeight: '80px', resize: 'vertical' }} />
                ) : (
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <label style={{ color: '#a0a8b8', fontSize: '12px', fontWeight: 700 }}>Type:</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ padding: '6px 10px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }}>
                <option value="technical">Technical</option><option value="cultural">Cultural</option><option value="social">Social</option><option value="sports">Sports</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e8eaf0', fontSize: '13px', marginBottom: '20px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isRecruitmentActive} onChange={e => setForm(p => ({ ...p, isRecruitmentActive: e.target.checked }))} /> Recruitment Active?
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: '#a0a8b8', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>Cancel</button>
              <button onClick={handleSubmit} style={{ padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #e53935)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
