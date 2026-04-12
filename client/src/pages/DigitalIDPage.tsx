import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../services/api';
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

export default function DigitalIDPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await profileApi.getMyProfile();
      if (res.success && res.data?.profile) {
        const p: Profile = res.data.profile;
        setProfile(p);
        const qrPayload = JSON.stringify({
          uid: res.data.id,
          name: res.data.fullName,
          role: res.data.role,
          card: p.idCardNumber,
        });
        const qrUrl = await QRCode.toDataURL(qrPayload, {
          width: 160,
          margin: 1,
          color: { dark: '#1a237e', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(qrUrl);
      }
    } catch {
      toast.error('Failed to load ID card');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const wasFlipped = flipped;
      if (wasFlipped) setFlipped(false);
      await new Promise(r => setTimeout(r, 300));
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: undefined,
      });
      const link = document.createElement('a');
      link.download = `SmartCampus-ID-${profile?.idCardNumber || 'card'}.png`;
      link.href = dataUrl;
      link.click();
      if (wasFlipped) setFlipped(true);
      toast.success('ID Card downloaded!');
    } catch {
      toast.error('Download failed. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  const roleLabel = (r: string) => r === 'student' ? 'STUDENT' : r === 'faculty' ? 'FACULTY' : 'ADMIN';

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <h2>Smart Campus</h2>
        </div>
        <div className="user-info">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/profile')}>
            ✏️ Edit Profile
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h1>Your Digital ID 🪪</h1>
          <p>Official Smart Campus identification card. Click to flip. Download as PNG.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
          </div>
        ) : (
          <div className="id-card-scene">
            {/* Card flip container */}
            <div
              className={`id-card-flipper${flipped ? ' flipped' : ''}`}
              onClick={() => setFlipped(f => !f)}
              title="Click to flip card"
            >
              {/* ── FRONT ─────────────────────────────────────────────── */}
              <div className="id-card-face id-card-front id-blue" ref={cardRef}>
                {/* Blue header stripe */}
                <div className="id-card-header" style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)' }}>
                  <div className="id-card-logo-row">
                    <img
                      src={bbdLogo}
                      alt="BBD University"
                      style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em', color: '#fff' }}>
                        {profile?.university || 'BBD UNIVERSITY'}
                      </div>
                      <div style={{ fontSize: '9px', opacity: 0.85, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>
                        Official Campus Identity Card
                      </div>
                    </div>
                  </div>
                  <div className="id-card-role-pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                    {roleLabel(user.role)}
                  </div>
                </div>

                {/* White body */}
                <div className="id-card-body" style={{ background: '#fff', padding: '12px 14px' }}>
                  {/* Avatar */}
                  <div className="id-card-avatar-wrap" style={{ border: '2px solid #1a237e' }}>
                    {profile?.avatarBase64 ? (
                      <img src={profile.avatarBase64} alt="Avatar" className="id-card-avatar" />
                    ) : (
                      <div className="id-card-avatar-placeholder" style={{ background: '#e3f2fd', color: '#1a237e' }}>
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="id-card-details">
                    <div className="id-card-name" style={{ color: '#000' }}>{user.fullName}</div>

                    {/* ── Student fields ── */}
                    {user.role === 'student' && (
                      <>
                        {profile?.course && (
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#1a237e', marginTop: '2px' }}>
                            {profile.course}{profile.year ? ` · Year ${profile.year}` : ''}{profile.section ? ` · Sec ${profile.section}` : ''}
                          </div>
                        )}
                        {profile?.department && (
                          <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>{profile.department}</div>
                        )}
                        {profile?.rollNumber && (
                          <div style={{ fontSize: '9px', color: '#333', marginTop: '2px' }}>Roll: {profile.rollNumber}</div>
                        )}
                        {/* Blood Group pill on front */}
                        {profile?.bloodGroup && (
                          <div style={{ display: 'inline-block', background: '#c62828', color: '#fff', borderRadius: '4px', padding: '1px 7px', fontSize: '9px', fontWeight: 900, marginTop: '4px', letterSpacing: '0.08em' }}>
                            🩸 {profile.bloodGroup}
                          </div>
                        )}
                      </>
                    )}

                    {/* ── Faculty/Admin fields ── */}
                    {(user.role === 'faculty' || user.role === 'admin') && (
                      <>
                        {profile?.designation && (
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#1a237e', marginTop: '2px' }}>{profile.designation}</div>
                        )}
                        {profile?.department && (
                          <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>{profile.department}</div>
                        )}
                        {profile?.employeeId && (
                          <div style={{ fontSize: '9px', color: '#333', marginTop: '2px' }}>Emp ID: {profile.employeeId}</div>
                        )}
                      </>
                    )}

                    <div style={{ fontSize: '9px', color: '#666', marginTop: '3px' }}>{user.email}</div>
                  </div>
                </div>

                {/* Blue footer — Unique ID + Hosteler/Day Scholar (student) or Valid (staff) */}
                <div className="id-card-footer" style={{ background: '#1a237e', borderTop: '2px solid #1565c0' }}>
                  <div>
                    <div style={{ fontSize: '8px', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.05em', color: '#fff' }}>UNIQUE ID</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '10px', letterSpacing: '0.05em', color: '#fff' }}>{profile?.idCardNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {user.role === 'student' ? (
                      <>
                        <div style={{ fontSize: '8px', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.05em', color: '#fff' }}>STATUS</div>
                        <div style={{ fontWeight: 800, fontSize: '10px', color: '#fff' }}>
                          {profile?.hostelName ? '🏠 Hosteler' : '🚌 Day Scholar'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '8px', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.05em', color: '#fff' }}>VALID</div>
                        <div style={{ fontWeight: 700, fontSize: '10px', color: '#fff' }}>
                          {new Date().getFullYear()}–{new Date().getFullYear() + 1}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Blue chip decoration */}
                <div className="id-card-chip" style={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5, #0d47a1)' }} />
              </div>

              {/* ── BACK ──────────────────────────────────────────────── */}
              <div className="id-card-face id-card-back id-blue">
                <div className="id-card-back-stripe" style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)' }} />
                <div className="id-card-back-body" style={{ background: '#fff', padding: '10px 14px' }}>

                  {/* QR + right panel */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    {/* QR */}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '10px', color: '#1a237e', marginBottom: '3px', letterSpacing: '0.06em' }}>SCAN TO VERIFY</div>
                      {qrDataUrl ? (
                        <div className="qr-container" style={{ border: '2px solid #1a237e', width: '80px', height: '80px', margin: '0 auto' }}>
                          <img src={qrDataUrl} alt="QR Code" className="qr-image" style={{ width: '100%', height: '100%' }} />
                        </div>
                      ) : (
                        <div className="qr-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', margin: '0 auto' }}>
                          <div className="loading-spinner" />
                        </div>
                      )}
                    </div>

                    {/* Right panel — student: blood group + hostel; faculty/admin: role + designation */}
                    {user.role === 'student' ? (
                      <div style={{ flex: 1 }}>
                        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#1a237e', letterSpacing: '0.06em' }}>BLOOD GROUP</div>
                          <div style={{ fontSize: '28px', fontWeight: 900, color: '#c62828', lineHeight: 1 }}>{profile?.bloodGroup || '—'}</div>
                        </div>
                        <div style={{ background: profile?.hostelName ? '#1a237e' : '#2e7d32', borderRadius: '6px', padding: '5px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em' }}>
                            {profile?.hostelName ? 'HOSTEL' : 'STATUS'}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>
                            {profile?.hostelName
                              ? `${profile.hostelName}${profile.hostelRoom ? ` · Rm ${profile.hostelRoom}` : ''}`
                              : 'Day Scholar'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1 }}>
                        <div style={{ background: '#1a237e', borderRadius: '6px', padding: '5px 8px', textAlign: 'center', marginBottom: '5px' }}>
                          <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em' }}>ROLE</div>
                          <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>{roleLabel(user.role)}</div>
                        </div>
                        {profile?.designation && (
                          <div style={{ background: '#e3f2fd', borderRadius: '6px', padding: '5px 8px', textAlign: 'center', marginBottom: '5px' }}>
                            <div style={{ fontSize: '8px', fontWeight: 700, color: '#1a237e', letterSpacing: '0.06em' }}>DESIGNATION</div>
                            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1a237e' }}>{profile.designation}</div>
                          </div>
                        )}
                        {profile?.employeeId && (
                          <div style={{ background: '#f3f4f6', borderRadius: '6px', padding: '4px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '8px', fontWeight: 700, color: '#374151', letterSpacing: '0.06em' }}>EMP ID</div>
                            <div style={{ fontSize: '9px', fontWeight: 800, color: '#374151', fontFamily: 'monospace' }}>{profile.employeeId}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info grid — role-specific labels */}
                  <div className="id-back-info" style={{ border: '1px solid #1a237e22', padding: '6px 10px' }}>
                    <div className="id-back-row">
                      <span style={{ color: '#1a237e' }}>Name</span>
                      <span style={{ color: '#000', fontWeight: 700 }}>{user.fullName}</span>
                    </div>
                    {profile?.phone && (
                      <div className="id-back-row">
                        <span style={{ color: '#1a237e' }}>
                          {user.role === 'student' ? '📞 Contact' : '📞 Office No.'}
                        </span>
                        <span style={{ color: '#000', fontWeight: 600 }}>{profile.phone}</span>
                      </div>
                    )}
                    {profile?.altPhone && (
                      <div className="id-back-row">
                        <span style={{ color: '#1a237e' }}>
                          {user.role === 'student' ? '🆘 Emergency' : '📱 Mobile'}
                        </span>
                        <span style={{ color: '#000', fontWeight: 600 }}>{profile.altPhone}</span>
                      </div>
                    )}
                    {user.role === 'student' && profile?.homeAddress && (
                      <div className="id-back-row">
                        <span style={{ color: '#1a237e' }}>🏠 Address</span>
                        <span style={{ color: '#000', fontSize: '9px' }}>{profile.homeAddress}</span>
                      </div>
                    )}
                    <div className="id-back-row">
                      <span style={{ color: '#1a237e' }}>Unique ID</span>
                      <span style={{ color: '#000', fontFamily: 'monospace', fontSize: '10px', fontWeight: 700 }}>{profile?.idCardNumber}</span>
                    </div>
                    <div className="id-back-row">
                      <span style={{ color: '#1a237e' }}>Valid</span>
                      <span style={{ color: '#000', fontWeight: 600 }}>{new Date().getFullYear()} – {new Date().getFullYear() + 1}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '6px', fontSize: '7px', color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
                    This card is property of {profile?.university || 'BBD University'}. If found, return to Admin.
                  </div>
                </div>
              </div>
            </div>

            {/* Hint text */}
            <p className="id-card-hint">Click the card to flip · {flipped ? 'Showing back' : 'Showing front'}</p>

            {/* Action buttons */}
            <div className="id-card-actions">
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={downloading}
                style={{ minWidth: '180px' }}
              >
                {downloading ? (
                  <><span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Downloading...</>
                ) : (
                  '⬇️ Download Card'
                )}
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/profile')}>
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
