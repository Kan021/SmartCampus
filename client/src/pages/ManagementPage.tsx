import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { managementApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Entry {
  id: string; name: string; designation: string; department?: string;
  school?: string; office?: string; phone?: string; email?: string;
  photoBase64?: string; order: number;
}

export default function ManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', designation: '', department: '', school: '', office: '', phone: '', email: '', photoBase64: '', order: 0 });

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    try { const r = await managementApi.list(); if (r.data) setEntries(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(p => ({ ...p, photoBase64: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      if (editId) { await managementApi.update(editId, form); }
      else { await managementApi.create(form); }
      setShowForm(false); setEditId(null); load();
    } catch {}
  };

  const startEdit = (e: Entry) => {
    setForm({ name: e.name, designation: e.designation, department: e.department || '', school: e.school || '', office: e.office || '', phone: e.phone || '', email: e.email || '', photoBase64: e.photoBase64 || '', order: e.order });
    setEditId(e.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => { if (confirm('Delete?')) { await managementApi.delete(id); load(); } };

  return (
    <div>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px' }}>👔 University Management</span>
        </div>
        {isAdmin && <button onClick={() => { setEditId(null); setForm({ name: '', designation: '', department: '', school: '', office: '', phone: '', email: '', photoBase64: '', order: 0 }); setShowForm(true); }} style={{ padding: '8px 18px', borderRadius: '10px', background: '#fff', color: '#C62828', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>+ Add Entry</button>}
      </header>

      <div style={{ padding: '28px 32px' }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px' }}>Loading...</div>}
        {!loading && entries.length === 0 && <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px', fontSize: '16px' }}>No entries yet.</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {entries.map(e => (
            <div key={e.id} style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid var(--color-border, rgba(0,0,0,0.1))', background: 'var(--color-card-bg, #fff)', boxShadow: '0 6px 24px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }} onMouseOver={ev => (ev.currentTarget.style.transform = 'translateY(-3px)')} onMouseOut={ev => (ev.currentTarget.style.transform = 'none')}>
              {/* Photo + header */}
              <div style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', padding: '24px', display: 'flex', gap: '18px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#252834', border: '3px solid rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {e.photoBase64 ? (
                    <img src={e.photoBase64} alt={e.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '32px' }}>👤</span>
                  )}
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 900, margin: '0 0 4px' }}>{e.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, margin: 0 }}>{e.designation}</p>
                </div>
              </div>
              {/* Details */}
              <div style={{ padding: '20px 24px' }}>
                {e.school && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a8b8', fontSize: '13px', marginBottom: '8px' }}>🏛️ {e.school}</div>}
                {e.department && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a8b8', fontSize: '13px', marginBottom: '8px' }}>📚 {e.department}</div>}
                {e.office && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a8b8', fontSize: '13px', marginBottom: '8px' }}>📍 {e.office}</div>}
                {e.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a8b8', fontSize: '13px', marginBottom: '8px' }}>📞 {e.phone}</div>}
                {e.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a8b8', fontSize: '13px', marginBottom: '8px' }}>✉️ {e.email}</div>}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => startEdit(e)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#a0a8b8', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>✏️ Edit</button>
                    <button onClick={() => handleDelete(e.id)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,82,82,0.1)', color: '#ef5350', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>🗑️</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1d27', borderRadius: '18px', padding: '32px', width: '480px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: '#fff', margin: '0 0 20px', fontWeight: 900 }}>{editId ? 'Edit Entry' : 'Add Management Entry'}</h2>
            {[{ l: 'Full Name', k: 'name' }, { l: 'Designation (Dean/HOD)', k: 'designation' }, { l: 'School', k: 'school' }, { l: 'Department', k: 'department' }, { l: 'Office Location', k: 'office' }, { l: 'Phone', k: 'phone' }, { l: 'Email', k: 'email' }].map(f => (
              <div key={f.k} style={{ marginBottom: '12px' }}>
                <label style={{ color: '#a0a8b8', fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>{f.l}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }} />
              </div>
            ))}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#a0a8b8', fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Display Order</label>
              <input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))} style={{ width: '100px', padding: '10px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#a0a8b8', fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Photo</label>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ color: '#a0a8b8', fontSize: '12px' }} />
              {form.photoBase64 && <img src={form.photoBase64} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', marginTop: '8px', objectFit: 'cover' }} />}
            </div>
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
