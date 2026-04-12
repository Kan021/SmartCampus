import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const helplineContacts = [
  { name: 'Chief Proctor', role: 'BBD University', phone: '+91 522-6196216', phone2: '9889786389', email: '' },
  { name: 'Security (In-Campus)', role: 'Campus Security Office', phone: '+91 522-6196307', phone2: '', email: '' },
  { name: 'Police Out Post', role: 'Campus Police Station', phone: '9756163078', phone2: '', email: '' },
  { name: 'Asst. Security Officer', role: 'Security Department', phone: '9415195472', phone2: '', email: '' },
  { name: 'Women Grievances Cell', role: 'Dean Student Welfare', phone: '+91 522-6196216', phone2: '', email: 'dsw@bbdu.org' },
];

const importantNumbers = [
  { label: 'UGC Anti-Ragging Helpline', number: '1800-180-5522', highlight: true },
  { label: 'Chief Proctor (BBD University)', number: '+91 522-6196216', highlight: true },
  { label: 'National Emergency', number: '112', highlight: false },
  { label: 'Women Helpline', number: '181', highlight: false },
];

export default function AntiRaggingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error('Please describe the incident'); return; }
    setIsSubmitting(true);
    // Simulate submission (in production, this would go to a backend)
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
    toast.success('Report submitted anonymously. The committee will review it.');
    setDescription('');
    setFiles([]);
  };

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <h2>Anti-Ragging Cell</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>
            {roleEmoji[user.role]} {user.role}
          </span>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="dashboard-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '28px' }}>
        {/* Emergency Banner */}
        <div className="ar-emergency-banner">
          <div className="ar-emergency-icon">🚨</div>
          <div>
            <div className="ar-emergency-title">Ragging is a Criminal Offence</div>
            <div className="ar-emergency-sub">As per UGC regulations and Supreme Court directives, ragging in any form is strictly prohibited. Report immediately.</div>
          </div>
        </div>

        {/* Important Numbers */}
        <div className="ar-section">
          <h3 className="ar-section-title">📞 Emergency Helplines</h3>
          <div className="ar-numbers-grid">
            {importantNumbers.map((n, i) => (
              <a href={`tel:${n.number}`} className={`ar-number-card${n.highlight ? ' highlight' : ''}`} key={i}>
                <div className="ar-number-value">{n.number}</div>
                <div className="ar-number-label">{n.label}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Faculty Contacts */}
        <div className="ar-section">
          <h3 className="ar-section-title">👥 Authorities & Helpline Contacts</h3>
          <div className="ar-contacts-grid">
            {helplineContacts.map((c, i) => (
              <div className="ar-contact-card" key={i}>
                <div className="ar-contact-avatar">{c.name.charAt(0)}</div>
                <div className="ar-contact-info">
                  <div className="ar-contact-name">{c.name}</div>
                  <div className="ar-contact-role">{c.role}</div>
                  <div className="ar-contact-details">
                    <a href={`tel:${c.phone}`}>📱 {c.phone}</a>
                    {c.phone2 && <a href={`tel:${c.phone2}`}>📱 {c.phone2}</a>}
                    {c.email && <a href={`mailto:${c.email}`}>📧 {c.email}</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="ar-advisory-note">
            <strong>⚠️ Note:</strong> All freshers are advised to report any incidence of "Ragging" to their class coordinator / HoDs and any of the above authorities of the Institution immediately.
          </div>
        </div>

        {/* Anonymous Report Form */}
        <div className="ar-section">
          <h3 className="ar-section-title">📝 Report an Incident (Anonymous)</h3>
          <div className="ar-report-notice">
            🔒 Your identity will NOT be revealed. Reports are completely anonymous and confidential.
          </div>

          {submitted ? (
            <div className="ar-success-card">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <h4>Report Submitted Successfully</h4>
              <p>The Anti-Ragging Committee will review your report and take necessary action.</p>
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setSubmitted(false)}>
                Submit Another Report
              </button>
            </div>
          ) : (
            <div className="ar-form-card">
              <div className="form-group">
                <label className="form-label">Describe the Incident *</label>
                <textarea
                  className="form-input form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe what happened, when, where, and who was involved. Be as detailed as possible..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attach Evidence (optional)</label>
                <div className="ar-file-area" onClick={() => fileInputRef.current?.click()}>
                  <div className="ar-file-icon">📎</div>
                  <div className="ar-file-text">Click to upload screenshots, photos, or videos</div>
                  <div className="ar-file-hint">Max 5 files · Images & Videos accepted</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
                {files.length > 0 && (
                  <div className="ar-file-list">
                    {files.map((f, i) => (
                      <div className="ar-file-item" key={i}>
                        <span>{f.type.startsWith('video') ? '🎬' : '🖼️'} {f.name}</span>
                        <button onClick={() => removeFile(i)} className="ar-file-remove">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '17px' }}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Submitting...' : '🛡️ Submit Anonymous Report'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
