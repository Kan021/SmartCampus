import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import bbdLogo from '../assets/bbd-logo.png';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  profile?: {
    idCardNumber?: string;
    department?: string;
    rollNumber?: string;
    employeeId?: string;
    avatarBase64?: string;
    year?: number;
    section?: string;
    course?: string;
    bloodGroup?: string;
    hostelName?: string;
    hostelRoom?: string;
    phone?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ['student', 'faculty', 'admin'] as const;
type Role = (typeof ROLES)[number];

export default function AdminUsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Advanced filters
  const [yearFilter, setYearFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [showAdvFilters, setShowAdvFilters] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkYear, setBulkYear] = useState('');
  const [bulkSection, setBulkSection] = useState('');
  const [bulkCourse, setBulkCourse] = useState('');
  const [bulking, setBulking] = useState(false);

  // Edit profile modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({
    year: '', section: '', course: '', department: '', rollNumber: '', bloodGroup: '', hostelName: '', hostelRoom: '', phone: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (u: UserRow) => {
    setEditUser(u);
    setEditFields({
      year: u.profile?.year ? String(u.profile.year) : '',
      section: u.profile?.section || '',
      course: u.profile?.course || '',
      department: u.profile?.department || '',
      rollNumber: u.profile?.rollNumber || '',
      bloodGroup: u.profile?.bloodGroup || '',
      hostelName: u.profile?.hostelName || '',
      hostelRoom: u.profile?.hostelRoom || '',
      phone: u.profile?.phone || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    const body: Record<string, any> = { ...editFields };
    if (body.year) body.year = Number(body.year);
    const res = await profileApi.updateUserProfile(editUser.id, body);
    if (res.success) {
      toast.success('Profile updated!');
      setEditUser(null);
      fetchUsers(pagination.page);
    } else {
      toast.error((res as any).message || 'Failed');
    }
    setSavingEdit(false);
  };

  const fetchUsers = useCallback(async (page = 1, searchVal = search, roleVal = roleFilter) => {
    setLoading(true);
    try {
      const res = await profileApi.listUsers({
        page,
        limit: pagination.limit,
        search: searchVal || undefined,
        role: roleVal || undefined,
        year: yearFilter ? Number(yearFilter) : undefined,
        section: sectionFilter || undefined,
        course: courseFilter || undefined,
      });
      if (res.success && res.data) {
        setUsers(res.data.users);
        setPagination(res.data.pagination);
        setSelected(new Set()); // clear selection on fetch
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, roleFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => fetchUsers(1, val, roleFilter), 400);
    setSearchTimeout(t);
  };

  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    fetchUsers(1, search, val);
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingRole(userId);
    try {
      const res = await profileApi.updateUserRole(userId, newRole);
      if (res.success) {
        toast.success(`Role updated to ${newRole}`);
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        toast.error((res as any).message || 'Failed to update role');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  // Apply advanced filters
  const applyFilters = () => fetchUsers(1);

  // Bulk update handler
  const handleBulkUpdate = async () => {
    if (selected.size === 0) { toast.error('Select at least one user'); return; }
    const updates: Record<string, any> = {};
    if (bulkYear) updates.year = Number(bulkYear);
    if (bulkSection) updates.section = bulkSection;
    if (bulkCourse) updates.course = bulkCourse;
    if (Object.keys(updates).length === 0) { toast.error('Set at least one field to update'); return; }
    setBulking(true);
    const res = await profileApi.bulkUpdateProfiles([...selected], updates);
    if (res.success) {
      toast.success(res.message || `Updated ${res.data?.updatedCount} profiles`);
      setShowBulkPanel(false);
      setBulkYear(''); setBulkSection(''); setBulkCourse('');
      fetchUsers(pagination.page);
    } else {
      toast.error((res as any).message || 'Failed');
    }
    setBulking(false);
  };

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };
  const stats = {
    total: pagination.total,
    students: users.filter(u => u.role === 'student').length,
    faculty: users.filter(u => u.role === 'faculty').length,
    admins: users.filter(u => u.role === 'admin').length,
  };
  const currentPageLabel = pagination.totalPages > 1 ? ' (this page)' : '';

  if (!user || user.role !== 'admin') {
    return (
      <div className="dashboard-layout">
        <main className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
            <h2>Access Denied</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Admin privileges required.</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <h2>Smart Campus</h2>
        </div>
        <div className="user-info">
          <span className="role-badge admin">🛠️ admin</span>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h1>User Management 👥</h1>
          <p>View, search, and manage all campus users. Update roles with caution.</p>
        </div>

        {/* Stats Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{pagination.total}</div>
            <div className="admin-stat-label">Total Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value" style={{ color: '#6366f1' }}>{stats.students}</div>
            <div className="admin-stat-label">🎓 Students{currentPageLabel}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value" style={{ color: '#0ea5e9' }}>{stats.faculty}</div>
            <div className="admin-stat-label">👨‍🏫 Faculty{currentPageLabel}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value" style={{ color: '#f59e0b' }}>{stats.admins}</div>
            <div className="admin-stat-label">🛠️ Admins{currentPageLabel}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input
              className="form-input search-input"
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {['', ...ROLES].map(r => (
              <button
                key={r || 'all'}
                className={`filter-tab${roleFilter === r ? ' active' : ''}`}
                onClick={() => handleRoleFilter(r)}
              >
                {r ? `${roleEmoji[r]} ${r}` : 'All Roles'}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <div style={{ marginBottom: '12px' }}>
          <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => setShowAdvFilters(!showAdvFilters)}>
            {showAdvFilters ? '▼ Hide' : '▶ Show'} Advanced Filters (Year / Section / Course)
          </button>
          {showAdvFilters && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '100px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Year</label>
                <select className="form-input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ fontSize: '14px' }}>
                  <option value="">All</option>
                  <option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Section</label>
                <select className="form-input" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} style={{ fontSize: '14px' }}>
                  <option value="">All</option>
                  {['41','42','43','44','45','46','47','48','49'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '100px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Course</label>
                <input className="form-input" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} placeholder="e.g. CS" style={{ fontSize: '14px' }} />
              </div>
              <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }} onClick={applyFilters}>🔍 Apply</button>
              <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => { setYearFilter(''); setSectionFilter(''); setCourseFilter(''); setTimeout(() => fetchUsers(1), 50); }}>Clear</button>
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#1a237e', color: '#fff', padding: '10px 18px', borderRadius: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '14px' }}>{selected.size} user{selected.size > 1 ? 's' : ''} selected</strong>
            <button className="btn" style={{ background: '#fff', color: '#1a237e', fontWeight: 800, fontSize: '13px', padding: '6px 16px' }}
              onClick={() => setShowBulkPanel(true)}>
              📝 Bulk Update Year / Section
            </button>
            <button className="btn btn-ghost" style={{ color: '#fff', fontSize: '13px' }} onClick={() => setSelected(new Set())}>✕ Clear</button>
          </div>
        )}

        {/* Bulk Update Panel */}
        {showBulkPanel && (
          <div className="modal-overlay" onClick={() => setShowBulkPanel(false)}>
            <div className="cr-person-modal" style={{ maxWidth: '440px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowBulkPanel(false)}>✕</button>
              <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px' }}>📝 Bulk Update — {selected.size} Users</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>Set fields below. Only filled fields will be updated.</p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-input" value={bulkYear} onChange={e => setBulkYear(e.target.value)}>
                    <option value="">— No change —</option>
                    <option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <input className="form-input" value={bulkSection} onChange={e => setBulkSection(e.target.value)} placeholder="e.g. 42" />
                </div>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <input className="form-input" value={bulkCourse} onChange={e => setBulkCourse(e.target.value)} placeholder="e.g. CS" />
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleBulkUpdate} disabled={bulking}>
                {bulking ? '⏳ Updating...' : `🚀 Update ${selected.size} Profile(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="admin-table-wrapper">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto', width: '36px', height: '36px', borderWidth: '3px' }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <p>No users found matching your filters.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>
                    <input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  </th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Campus ID</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`admin-table-row${selected.has(u.id) ? ' selected' : ''}`}>
                    <td>
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="table-avatar">
                          {u.profile?.avatarBase64 ? (
                            <img src={u.profile.avatarBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            u.fullName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.fullName}</div>
                          {(u.profile?.rollNumber || u.profile?.employeeId) && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                              {u.profile?.rollNumber || u.profile?.employeeId}
                            </div>
                          )}
                          {(u.profile?.year || u.profile?.section) && (
                            <div style={{ fontSize: '10px', color: '#1a237e', fontWeight: 700 }}>
                              {u.profile?.course || ''}{u.profile?.section ? u.profile.section : ''}{u.profile?.year ? ` · Year ${u.profile.year}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-accent-primary)' }}>
                        {u.profile?.idCardNumber || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {u.profile?.department || '—'}
                    </td>
                    <td>
                      <span className={`status-pill ${u.isVerified ? 'verified' : 'unverified'}`}>
                        {u.isVerified ? '✓ Verified' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      {updatingRole === u.id ? (
                        <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                      ) : (
                        <select
                          className={`role-select ${u.role}`}
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                          disabled={u.id === user.id}
                          title={u.id === user.id ? 'Cannot change own role' : 'Change role'}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{roleEmoji[r]} {r}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => openEditModal(u)}>✏️ Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="btn btn-ghost"
              disabled={pagination.page <= 1}
              onClick={() => fetchUsers(pagination.page - 1)}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
            </span>
            <button
              className="btn btn-ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchUsers(pagination.page + 1)}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Edit Profile Modal */}
        {editUser && (
          <div className="modal-overlay" onClick={() => setEditUser(null)}>
            <div className="cr-person-modal" style={{ maxWidth: '520px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setEditUser(null)}>✕</button>
              <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px' }}>✏️ Edit: {editUser.fullName}</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>{editUser.email}</p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-input" value={editFields.year} onChange={e => setEditFields(p => ({...p, year: e.target.value}))}>
                    <option value="">—</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <input className="form-input" value={editFields.section} onChange={e => setEditFields(p => ({...p, section: e.target.value}))} placeholder="e.g. 41" />
                </div>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <input className="form-input" value={editFields.course} onChange={e => setEditFields(p => ({...p, course: e.target.value}))} placeholder="e.g. CS" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={editFields.department} onChange={e => setEditFields(p => ({...p, department: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input className="form-input" value={editFields.rollNumber} onChange={e => setEditFields(p => ({...p, rollNumber: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-input" value={editFields.bloodGroup} onChange={e => setEditFields(p => ({...p, bloodGroup: e.target.value}))}>
                    <option value="">—</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={editFields.hostelName} onChange={e => setEditFields(p => ({...p, hostelName: e.target.value}))} placeholder="Leave blank for Day Scholar" />
                </div>
                <div className="form-group">
                  <label className="form-label">Room No.</label>
                  <input className="form-input" value={editFields.hostelRoom} onChange={e => setEditFields(p => ({...p, hostelRoom: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={editFields.phone} onChange={e => setEditFields(p => ({...p, phone: e.target.value}))} placeholder="+91 ..." />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
