import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

type Category = 'hostel' | 'transport' | 'academic' | 'other';

const categories: { key: Category; icon: string; label: string; desc: string }[] = [
  { key: 'hostel', icon: '🏠', label: 'Hostel', desc: 'Room issues, mess, water, electricity, cleanliness' },
  { key: 'transport', icon: '🚌', label: 'Transportation', desc: 'Bus routes, timings, driver behavior, overcrowding' },
  { key: 'academic', icon: '📚', label: 'Academic', desc: 'Faculty issues, syllabus, exams, labs, grading' },
  { key: 'other', icon: '📋', label: 'Other', desc: 'General campus, infrastructure, admin issues' },
];

export default function ComplaintsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
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

  const resetForm = () => {
    setSelectedCategory(null);
    setSubject('');
    setDescription('');
    setFiles([]);
    setIsAnonymous(false);
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) { toast.error('Select a complaint category'); return; }
    if (!subject.trim()) { toast.error('Enter a subject'); return; }
    if (!description.trim()) { toast.error('Describe the issue'); return; }
    setIsSubmitting(true);
    // Simulate submission
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
    toast.success('Complaint submitted successfully!');
  };

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <span style={{ fontSize: '24px' }}>🧾</span>
          <h2>Complaint Box</h2>
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
        {/* Info Banner */}
        <div className="complaint-info-banner">
          <div className="complaint-info-icon">📬</div>
          <div>
            <div className="complaint-info-title">Submit a Grievance</div>
            <div className="complaint-info-sub">
              Your complaints are reviewed by the concerned department. You may choose to submit anonymously.
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="ar-success-card">
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
            <h4>Complaint Submitted</h4>
            <p>The {categories.find(c => c.key === selectedCategory)?.label} department has been notified and will take action.</p>
            <button className="btn btn-primary" style={{ marginTop: '18px' }} onClick={resetForm}>
              Submit Another Complaint
            </button>
          </div>
        ) : (
          <>
            {/* Category Selection */}
            <div className="ar-section">
              <h3 className="ar-section-title">1. Select Category</h3>
              <div className="complaint-cat-grid">
                {categories.map(cat => (
                  <div
                    className={`complaint-cat-card${selectedCategory === cat.key ? ' active' : ''}`}
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                  >
                    <div className="complaint-cat-icon">{cat.icon}</div>
                    <div className="complaint-cat-label">{cat.label}</div>
                    <div className="complaint-cat-desc">{cat.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complaint Form */}
            <div className="ar-section">
              <h3 className="ar-section-title">2. Describe the Issue</h3>
              <div className="ar-form-card">
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input
                    className="form-input"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief title of your complaint"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-input form-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Explain the issue in detail — what, when, where..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attachments (optional)</label>
                  <div className="ar-file-area" onClick={() => fileInputRef.current?.click()}>
                    <div className="ar-file-icon">📎</div>
                    <div className="ar-file-text">Click to upload screenshots or documents</div>
                    <div className="ar-file-hint">Max 5 files · Images & Videos</div>
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

                {/* Anonymous toggle */}
                <div className="complaint-anon-toggle" onClick={() => setIsAnonymous(!isAnonymous)}>
                  <div className={`complaint-anon-check${isAnonymous ? ' checked' : ''}`}>
                    {isAnonymous ? '✓' : ''}
                  </div>
                  <div>
                    <div className="complaint-anon-label">Submit Anonymously</div>
                    <div className="complaint-anon-hint">Your name and details will not be shared with the department</div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '16px', fontSize: '17px', marginTop: '12px' }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '⏳ Submitting...' : '📩 Submit Complaint'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
