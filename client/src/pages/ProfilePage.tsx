import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { profileApi, noticeApi } from '../services/api';
import bbdLogo from '../assets/bbd-logo.png';

interface Profile {
  id: string;
  phone?: string;
  bio?: string;
  department?: string;
  avatarBase64?: string;
  rollNumber?: string;
  year?: number;
  section?: string;
  course?: string;
  bloodGroup?: string;
  altPhone?: string;
  universityRollNo?: string;
  university?: string;
  hostelName?: string;
  hostelRoom?: string;
  homeAddress?: string;
  employeeId?: string;
  designation?: string;
  adminCode?: string;
  idCardNumber: string;
  issuedAt: string;
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Electrical Engineering',
  'Biotechnology',
  'Physics',
  'Mathematics',
  'Chemistry',
  'Business Administration',
  'Humanities',
  'Administration',
];

const DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Senior Lecturer',
  'Research Scholar',
  'Lab Instructor',
  'HOD',
];

const COURSES = [
  'B.Tech', 'M.Tech', 'MBA', 'BBA', 'BCA', 'MCA',
  'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'BA', 'MA',
  'B.Pharm', 'M.Pharm', 'LLB', 'Ph.D.',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const UNIVERSITIES = ['BBDU', 'BBDNIIT'];

function getSections(yearNum: number): string[] {
  if (!yearNum || yearNum < 1 || yearNum > 5) return [];
  return Array.from({ length: 9 }, (_, i) => `${yearNum}${i + 1}`);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form state — common
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // form state — student
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [course, setCourse] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [universityRollNo, setUniversityRollNo] = useState('');
  const [university, setUniversity] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [hostelRoom, setHostelRoom] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

  // form state — faculty/admin
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [adminCode, setAdminCode] = useState('');

  // Student change request
  const [showChangeReq, setShowChangeReq] = useState(false);
  const [changeReqText, setChangeReqText] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await profileApi.getMyProfile();
      if (res.success && res.data?.profile) {
        const p: Profile = res.data.profile;
        setProfile(p);
        setPhone(p.phone || '');
        setBio(p.bio || '');
        setDepartment(p.department || '');
        setAvatarPreview(p.avatarBase64 || null);
        setRollNumber(p.rollNumber || '');
        setYear(p.year ? String(p.year) : '');
        setSection(p.section || '');
        setCourse(p.course || '');
        setBloodGroup(p.bloodGroup || '');
        setAltPhone(p.altPhone || '');
        setUniversityRollNo(p.universityRollNo || '');
        setUniversity(p.university || '');
        setHostelName(p.hostelName || '');
        setHostelRoom(p.hostelRoom || '');
        setHomeAddress(p.homeAddress || '');
        setEmployeeId(p.employeeId || '');
        setDesignation(p.designation || '');
        setAdminCode(p.adminCode || '');
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = {
        phone: phone || null,
        bio: bio || null,
        department: department || null,
        avatarBase64: avatarPreview || null,
      };

      if (user?.role === 'student') {
        body.rollNumber = rollNumber || null;
        body.year = year ? parseInt(year) : null;
        body.section = section || null;
        body.course = course || null;
        body.bloodGroup = bloodGroup || null;
        body.altPhone = altPhone || null;
        body.universityRollNo = universityRollNo || null;
        body.university = university || null;
        body.hostelName = hostelName || null;
        body.hostelRoom = hostelRoom || null;
        body.homeAddress = homeAddress || null;
      } else if (user?.role === 'faculty') {
        body.employeeId = employeeId || null;
        body.designation = designation || null;
        body.altPhone = altPhone || null;  // mobile number
      } else if (user?.role === 'admin') {
        body.adminCode = adminCode || null;
        body.employeeId = employeeId || null;
        body.altPhone = altPhone || null;  // mobile number
      }

      const res = await profileApi.updateMyProfile(body);
      if (res.success) {
        toast.success('Profile saved successfully!');
        fetchProfile();
      } else {
        toast.error((res as any).message || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // When year changes, reset section
  useEffect(() => {
    if (!year) setSection('');
  }, [year]);

  const completion = () => {
    const fields = [phone, bio, department, avatarPreview];
    if (user?.role === 'student') { fields.push(rollNumber, year, section, course, bloodGroup, university); }
    if (user?.role === 'faculty') { fields.push(employeeId, designation); }
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <h2>Smart Campus</h2>
        </div>
        <div className="user-info">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/digital-id')}>
            🪪 My ID Card
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h1>My Profile ✏️</h1>
          <p>Manage your campus identity and personal information.</p>
        </div>

        {/* Profile Completion Bar */}
        <div className="profile-completion-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Profile Completion</span>
            <span style={{ fontWeight: 700, color: completion() >= 80 ? 'var(--color-success)' : 'var(--color-warning)', fontSize: '14px' }}>{completion()}%</span>
          </div>
          <div className="completion-bar-bg">
            <div className="completion-bar-fill" style={{ width: `${completion()}%` }} />
          </div>
          {completion() < 80 && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Complete your profile to unlock your full campus experience.
            </p>
          )}
        </div>

        <div className="profile-grid">
          {/* Left: Avatar */}
          <div className="profile-avatar-card">
            <div className="avatar-ring" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <span>{user.fullName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="avatar-overlay">
                <span>📷</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <h3 style={{ marginTop: '16px', fontWeight: 700, fontSize: '18px' }}>{user.fullName}</h3>
            <span className={`role-badge ${user.role}`} style={{ marginTop: '6px' }}>
              {roleEmoji[user.role]} {user.role}
            </span>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '8px' }}>{user.email}</p>
            {profile && (
              <div className="id-badge-mini">
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>CAMPUS ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-accent-primary)', fontWeight: 700 }}>{profile.idCardNumber}</span>
              </div>
            )}
            <button className="btn btn-secondary" style={{ marginTop: '16px', width: '100%' }} onClick={() => navigate('/digital-id')}>
              🪪 View ID Card
            </button>
          </div>

          {/* Right: Form */}
          <div className="profile-form-card">
            {loading ? (
              <div className="loading-spinner" style={{ margin: '40px auto' }} />
            ) : (
              <>
                <h3 style={{ fontWeight: 700, marginBottom: '24px', fontSize: '16px', color: 'var(--color-text-secondary)' }}>
                  Personal Information
                </h3>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-input form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                      <option value="">Select department...</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-input form-textarea" placeholder="Tell your campus community about yourself..." value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={400} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{bio.length}/400</span>
                </div>

                {/* ═══ Student Fields ═══ */}
                {user.role === 'student' && (
                  <>
                    <div className="role-section-label">🎓 Student Details</div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">University</label>
                        <select className="form-input form-select" value={university} onChange={e => setUniversity(e.target.value)}>
                          <option value="">Select university...</option>
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Course</label>
                        <select className="form-input form-select" value={course} onChange={e => setCourse(e.target.value)}>
                          <option value="">Select course...</option>
                          {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Academic Year</label>
                        <select className="form-input form-select" value={year} onChange={e => setYear(e.target.value)}>
                          <option value="">Select year...</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="5">5th Year</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Section {!year && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>(choose year first)</span>}</label>
                        <select className="form-input form-select" value={section} onChange={e => setSection(e.target.value)} disabled={!year}>
                          <option value="">Select section...</option>
                          {getSections(parseInt(year) || 0).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Class Roll Number</label>
                        <input className="form-input" type="text" placeholder="e.g. 42" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">University Roll Number</label>
                        <input className="form-input" type="text" placeholder="e.g. 2200321520042" value={universityRollNo} onChange={e => setUniversityRollNo(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select className="form-input form-select" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                          <option value="">Select blood group...</option>
                          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alternative Phone</label>
                        <input className="form-input" type="tel" placeholder="+91 91234 56789" value={altPhone} onChange={e => setAltPhone(e.target.value)} />
                      </div>
                    </div>

                    <div className="role-section-label" style={{ marginTop: '20px' }}>🏠 Accommodation</div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Hostel Name</label>
                        <input className="form-input" type="text" placeholder="e.g. Block-C Boys Hostel" value={hostelName} onChange={e => setHostelName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Room Number</label>
                        <input className="form-input" type="text" placeholder="e.g. C-204" value={hostelRoom} onChange={e => setHostelRoom(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Home Address</label>
                      <textarea className="form-input form-textarea" placeholder="Full permanent address..." value={homeAddress} onChange={e => setHomeAddress(e.target.value)} rows={2} maxLength={500} />
                    </div>
                  </>
                )}

                {/* ═══ Faculty Fields ═══ */}
                {user.role === 'faculty' && (
                  <>
                    <div className="role-section-label">👨‍🏫 Faculty Details</div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Employee ID</label>
                        <input className="form-input" type="text" placeholder="e.g. FAC2018042" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Designation</label>
                        <select className="form-input form-select" value={designation} onChange={e => setDesignation(e.target.value)}>
                          <option value="">Select designation...</option>
                          {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input className="form-input" type="tel" placeholder="+91 98765 43210" value={altPhone} onChange={e => setAltPhone(e.target.value)} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Personal mobile (shown on ID card)</span>
                    </div>
                  </>
                )}

                {/* ═══ Admin Fields ═══ */}
                {user.role === 'admin' && (
                  <>
                    <div className="role-section-label">🛠️ Admin Details</div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Employee ID</label>
                        <input className="form-input" type="text" placeholder="e.g. ADM-2021-001" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Admin Code</label>
                        <input className="form-input" type="text" placeholder="e.g. ADM-CORE-001" value={adminCode} onChange={e => setAdminCode(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input className="form-input" type="tel" placeholder="+91 98765 43210" value={altPhone} onChange={e => setAltPhone(e.target.value)} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Personal mobile (shown on ID card)</span>
                    </div>
                  </>
                )}

                <button
                  className="btn btn-primary"
                  style={{ marginTop: '24px', width: '100%', padding: '14px' }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <span className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : '💾 Save Profile'}
                </button>

                {/* Student: Request Profile Change */}
                {user.role === 'student' && (
                  <div style={{ marginTop: '20px' }}>
                    {!showChangeReq ? (
                      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowChangeReq(true)}>
                        📝 Request Profile Change (Year / Section)
                      </button>
                    ) : (
                      <div className="ar-form-card">
                        <h4 style={{ fontWeight: 800, marginBottom: '8px', fontSize: '16px' }}>📝 Request Profile Change</h4>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Describe which fields you need changed (e.g. year, section). Admin will review and approve.</p>
                        <textarea
                          className="form-input form-textarea"
                          rows={3}
                          placeholder="e.g. Please change my section from 41 to 42. Reason: ..."
                          value={changeReqText}
                          onChange={e => setChangeReqText(e.target.value)}
                          maxLength={500}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!changeReqText.trim() || submittingReq}
                            onClick={async () => {
                              setSubmittingReq(true);
                              const res = await noticeApi.create({
                                title: `Profile Change Request \u2014 ${user.fullName}`,
                                content: `${changeReqText}\n\n\u2014 ${user.email}`,
                                category: 'general',
                              });
                              if (res.success) { toast.success('Request submitted! Admin will review it.'); setShowChangeReq(false); setChangeReqText(''); }
                              else toast.error('Failed to submit request');
                              setSubmittingReq(false);
                            }}>
                            {submittingReq ? '\u23f3 Submitting...' : '\ud83d\udce4 Submit Request'}
                          </button>
                          <button className="btn btn-ghost" onClick={() => setShowChangeReq(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
