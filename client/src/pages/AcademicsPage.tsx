import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { academicsApi, feeReceiptApi } from '../services/api';

type Tab = 'results' | 'fees' | 'calendar';

interface FeeStructure { id: string; semester: number; year: number; course: string; category: string; amount: number; dueDate?: string; payment?: { id: string; status: string; amountPaid: number; paidAt?: string; transactionRef?: string; receiptStatus?: string; receiptFileName?: string } | null; status: string; }
interface PendingReceipt { id: string; receiptFileName?: string; receiptBase64?: string; receiptStatus: string; student: { fullName: string; email: string }; feeStructure: { category: string; amount: number; semester: number; course: string } }

export default function AcademicsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'student';

  const [tab, setTab] = useState<Tab>('results');
  const [loading, setLoading] = useState(true);

  // Fee panel state
  const FEE_AMOUNT = 62750;
  const FEE_DUE_DATE = new Date('2026-04-16T23:59:59');
  const [feeIsPaid, setFeeIsPaid] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = FEE_DUE_DATE.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
        expired: false,
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // Fee state
  const [fees, setFees] = useState<FeeStructure[]>([]);

  // Calendar state
  const [calView, setCalView] = useState<'academic' | 'holidays'>('academic');

  const academicEvents = [
    { title: 'Commencement of Classes of Odd Semester & Academic Registration', detail: 'Session 2025-26', dateStr: 'July 15, 2025', date: '2025-07-15' },
    { title: 'Completion of Teaching of 25% of Syllabus', detail: 'Respective Theory Subject', dateStr: 'August 08, 2025', date: '2025-08-08' },
    { title: 'Last Date of Submission of University Examination Form', detail: 'With the Department', dateStr: 'As per notification', date: null },
    { title: 'Completion of Teaching of 50% of Syllabus', detail: 'Respective Theory Subject', dateStr: 'September 12, 2025', date: '2025-09-12' },
    { title: 'First Theory and Practical Sessional Tests', detail: 'Compulsory for all students', dateStr: 'September 22 to 26, 2025', date: '2025-09-22' },
    { title: 'Completion of Teaching of 75% of Syllabus', detail: 'Respective Theory Subject', dateStr: 'October 10, 2025', date: '2025-10-10' },
    { title: 'Completion of Teaching of 100% of Syllabus', detail: 'Respective Theory Subject', dateStr: 'October 31, 2025', date: '2025-10-31' },
    { title: 'Second Theory and Practical Sessional Test', detail: 'Compulsory for all students', dateStr: 'November 03 to 08, 2025', date: '2025-11-03' },
    { title: 'Issuance of Admit Cards of Odd Semester University Examinations', detail: 'To the eligible students', dateStr: 'November 08 to 10, 2025', date: '2025-11-08' },
    { title: 'University Odd Semester Practical Examination', detail: '', dateStr: 'November 11 to 24, 2025', date: '2025-11-11' },
    { title: 'University Odd Semester Theory Examination', detail: '', dateStr: 'November 25, 2025 Onwards', date: '2025-11-25' },
    { title: 'Commencement of Classes of Even Semester', detail: 'Academic Session 2025-26', dateStr: 'January 05, 2026', date: '2026-01-05' },
  ];

  const holidays = [
    { name: 'Republic Day', numDays: 1, dateStr: 'January 26, 2025', day: 'Sunday', date: '2025-01-26' },
    { name: 'Maha Shivratri', numDays: 1, dateStr: 'February 26, 2025', day: 'Wednesday', date: '2025-02-26' },
    { name: 'Holi Vacations', numDays: 4, dateStr: 'March 13 to 16, 2025', day: 'Thu – Sun', date: '2025-03-13' },
    { name: 'Last Friday of Ramzan (Alvida)', numDays: 1, dateStr: 'March 28, 2025', day: 'Friday', date: '2025-03-28' },
    { name: "Founder's Day / Id-Ul-Fitar", numDays: 1, dateStr: 'March 31, 2025', day: 'Monday', date: '2025-03-31' },
    { name: 'Ramnavmi', numDays: 1, dateStr: 'April 06, 2025', day: 'Sunday', date: '2025-04-06' },
    { name: 'Mahavir Jayanti', numDays: 1, dateStr: 'April 10, 2025', day: 'Thursday', date: '2025-04-10' },
    { name: 'Dr. Bhim Rao Ambedkar Jayanti', numDays: 1, dateStr: 'April 14, 2025', day: 'Monday', date: '2025-04-14' },
    { name: 'Good Friday', numDays: 1, dateStr: 'April 18, 2025', day: 'Friday', date: '2025-04-18' },
    { name: 'Buddha Purnima', numDays: 1, dateStr: 'May 12, 2025', day: 'Monday', date: '2025-05-12' },
    { name: 'Id-Ul-Zuha (Bakhreed)', numDays: 1, dateStr: 'June 07, 2025', day: 'Saturday', date: '2025-06-07' },
    { name: 'Moharram', numDays: 1, dateStr: 'July 06, 2025', day: 'Sunday', date: '2025-07-06' },
    { name: 'Raksha Bandhan', numDays: 1, dateStr: 'August 09, 2025', day: 'Saturday', date: '2025-08-09' },
    { name: 'Independence Day', numDays: 1, dateStr: 'August 15, 2025', day: 'Friday', date: '2025-08-15' },
    { name: 'Janmashtmi', numDays: 1, dateStr: 'August 16, 2025', day: 'Saturday', date: '2025-08-16' },
    { name: 'Ganesh Chaturthi', numDays: 1, dateStr: 'August 27, 2025', day: 'Wednesday', date: '2025-08-27' },
    { name: 'Id-E-Milad (Barawafat)', numDays: 1, dateStr: 'September 05, 2025', day: 'Friday', date: '2025-09-05' },
    { name: 'Dushehra (Maha Navmi)', numDays: 1, dateStr: 'October 01, 2025', day: 'Wednesday', date: '2025-10-01' },
    { name: 'Gandhi Jayanti / Dushehra (Vijay Dashmi)', numDays: 1, dateStr: 'October 02, 2025', day: 'Thursday', date: '2025-10-02' },
    { name: 'Deepawali Vacations', numDays: 6, dateStr: 'October 19 to 24, 2025', day: 'Sun – Fri', date: '2025-10-19' },
    { name: 'Guru Nanak Jayanti / Kartik Purnima', numDays: 1, dateStr: 'November 05, 2025', day: 'Wednesday', date: '2025-11-05' },
    { name: 'Christmas Day', numDays: 1, dateStr: 'December 25, 2025', day: 'Thursday', date: '2025-12-25' },
  ];

  // Admin: create fee form
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeSemester, setFeeSemester] = useState('1');
  const [feeYear, setFeeYear] = useState(String(new Date().getFullYear()));
  const [feeCourse, setFeeCourse] = useState('');
  const [feeCategory, setFeeCategory] = useState('tuition');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');
  // Receipt upload state
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<{ base64: string; name: string } | null>(null);
  // Admin: pending receipts
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    if (tab === 'results' || tab === 'calendar') { setLoading(false); return; }
    setLoading(true);
    try {
      if (tab === 'fees') {
        const res = await academicsApi.getMyFees();
        if (res.success && res.data) {
          setFees(res.data.fees || []);
        }
        // Admin: load pending receipts
        if (role === 'admin' || role === 'faculty') {
          try {
            const pr = await feeReceiptApi.getPending();
            if (pr.success && pr.data) setPendingReceipts(pr.data);
          } catch {}
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };



  const handleCreateFee = async () => {
    if (!feeCourse || !feeAmount) { toast.error('Fill all fields'); return; }
    try {
      const res = await academicsApi.createFeeStructure({
        semester: parseInt(feeSemester), year: parseInt(feeYear),
        course: feeCourse, category: feeCategory, amount: parseFloat(feeAmount),
        dueDate: feeDueDate ? new Date(feeDueDate).toISOString() : undefined,
      });
      if (res.success) {
        toast.success('Fee structure created!');
        setShowFeeForm(false);
        setFeeAmount(''); setFeeCourse('');
        loadData();
      } else { toast.error(res.message || 'Failed'); }
    } catch (err: any) { toast.error(err?.message || 'Error'); }
  };

  const categoryEmoji: Record<string, string> = {
    exam: '📝', holiday: '🏖️', deadline: '⏰', event: '🎉', general: '📌',
    tuition: '🎓', hostel: '🏠', lab: '🔬', library: '📚', transport: '🚌',
  };

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <span style={{ fontSize: '24px' }}>📊</span>
          <h2>Academics</h2>
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

      <main className="dashboard-content">
        {/* Tab Switcher */}
        <div className="acad-tabs">
          <button className={`acad-tab${tab === 'results' ? ' active' : ''}`} onClick={() => setTab('results')}>
            📝 Results
          </button>
          <button className={`acad-tab${tab === 'fees' ? ' active' : ''}`} onClick={() => setTab('fees')}>
            💰 Fees
          </button>
          <button className={`acad-tab${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>
            📅 Calendar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* ═══ RESULTS TAB ═══ */}
            {tab === 'results' && (
              <div className="acad-section">
                <div className="acad-results-header">
                  <h3>📝 Check Your Results</h3>
                  <p>Select the appropriate result portal below to view your results on the BBDU Exam Cell website.</p>
                </div>

                <div className="acad-result-links">
                  <a href="https://examcell.bbdu.ac.in/bbdu-result/" target="_blank" rel="noopener noreferrer" className="acad-result-link-card">
                    <div className="acad-result-link-icon">📄</div>
                    <div className="acad-result-link-body">
                      <div className="acad-result-link-title">Main / Carry Over Results</div>
                      <div className="acad-result-link-desc">Regular semester results and carry over examination results</div>
                    </div>
                    <div className="acad-result-link-arrow">→</div>
                  </a>

                  <a href="https://examcell.bbdu.ac.in/bbduscrutiny-result/" target="_blank" rel="noopener noreferrer" className="acad-result-link-card">
                    <div className="acad-result-link-icon">🔍</div>
                    <div className="acad-result-link-body">
                      <div className="acad-result-link-title">Scrutiny / Reevaluation Results</div>
                      <div className="acad-result-link-desc">Results for scrutiny and re-evaluation applications</div>
                    </div>
                    <div className="acad-result-link-arrow">→</div>
                  </a>

                  <a href="https://examcell.bbdu.ac.in/bbducombo-result/" target="_blank" rel="noopener noreferrer" className="acad-result-link-card">
                    <div className="acad-result-link-icon">🧪</div>
                    <div className="acad-result-link-body">
                      <div className="acad-result-link-title">B.Sc / BID Results</div>
                      <div className="acad-result-link-desc">Results for B.Sc and BID programme examinations</div>
                    </div>
                    <div className="acad-result-link-arrow">→</div>
                  </a>

                  <a href="https://examcell.bbdu.ac.in/bbdudental-result/" target="_blank" rel="noopener noreferrer" className="acad-result-link-card">
                    <div className="acad-result-link-icon">🦷</div>
                    <div className="acad-result-link-body">
                      <div className="acad-result-link-title">Dental Results</div>
                      <div className="acad-result-link-desc">Results for Dental faculty examinations</div>
                    </div>
                    <div className="acad-result-link-arrow">→</div>
                  </a>

                  <a href="https://examcell.bbdu.ac.in/bbduphd-result/" target="_blank" rel="noopener noreferrer" className="acad-result-link-card">
                    <div className="acad-result-link-icon">🎓</div>
                    <div className="acad-result-link-body">
                      <div className="acad-result-link-title">PhD Results</div>
                      <div className="acad-result-link-desc">Results for PhD research and coursework examinations</div>
                    </div>
                    <div className="acad-result-link-arrow">→</div>
                  </a>

                  <a href="https://examcell.bbdu.ac.in/bbduexamcell/" target="_blank" rel="noopener noreferrer" className="acad-result-link-card">
                    <div className="acad-result-link-icon">📋</div>
                    <div className="acad-result-link-body">
                      <div className="acad-result-link-title">Examination / Enrollment Form</div>
                      <div className="acad-result-link-desc">Fill and submit your examination enrollment form online</div>
                    </div>
                    <div className="acad-result-link-arrow">→</div>
                  </a>
                </div>
              </div>
            )}

            {/* ═══ FEES TAB ═══ */}
            {tab === 'fees' && (
              <div className="acad-section">
                {/* Admin: Create Fee Structure */}
                {role === 'admin' && (
                  <>
                    <button className="btn btn-primary" style={{ marginBottom: '20px' }} onClick={() => setShowFeeForm(!showFeeForm)}>
                      {showFeeForm ? 'Cancel' : '+ Create Fee Structure'}
                    </button>
                    {showFeeForm && (
                      <div className="acad-form-card">
                        <h3>💰 New Fee Structure</h3>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select className="form-input form-select" value={feeSemester} onChange={e => setFeeSemester(e.target.value)}>
                              {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Year</label>
                            <input className="form-input" type="number" value={feeYear} onChange={e => setFeeYear(e.target.value)} />
                          </div>
                        </div>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Course</label>
                            <input className="form-input" value={feeCourse} onChange={e => setFeeCourse(e.target.value)} placeholder="e.g. B.Tech" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-input form-select" value={feeCategory} onChange={e => setFeeCategory(e.target.value)}>
                              {['tuition', 'hostel', 'exam', 'lab', 'library', 'transport'].map(c => (
                                <option key={c} value={c}>{categoryEmoji[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Amount (₹)</label>
                            <input className="form-input" type="number" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="e.g. 45000" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input className="form-input" type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} />
                          </div>
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreateFee}>Create Fee Structure</button>
                      </div>
                    )}
                  </>
                )}

                {/* ─── Semester Fee Panel ─── */}
                <div className={`fee-panel ${feeIsPaid ? 'paid' : 'due'}`}>
                  <div className="fee-panel-top">
                    <div className="fee-panel-label">Semester Fee</div>
                    <div className={`fee-panel-status ${feeIsPaid ? 'paid' : 'due'}`}>
                      {feeIsPaid ? '✅ PAID' : '🔴 DUE'}
                    </div>
                  </div>

                  <div className="fee-panel-amount">₹{FEE_AMOUNT.toLocaleString('en-IN')}</div>

                  {!feeIsPaid && (
                    <>
                      <div className="fee-panel-deadline">
                        <span>⏰ Last Date of Submission:</span>
                        <strong>{FEE_DUE_DATE.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </div>

                      {!countdown.expired ? (
                        <div className="fee-countdown">
                          <div className="fee-countdown-box">
                            <div className="fee-countdown-val">{String(countdown.days).padStart(2, '0')}</div>
                            <div className="fee-countdown-unit">Days</div>
                          </div>
                          <div className="fee-countdown-sep">:</div>
                          <div className="fee-countdown-box">
                            <div className="fee-countdown-val">{String(countdown.hours).padStart(2, '0')}</div>
                            <div className="fee-countdown-unit">Hours</div>
                          </div>
                          <div className="fee-countdown-sep">:</div>
                          <div className="fee-countdown-box">
                            <div className="fee-countdown-val">{String(countdown.mins).padStart(2, '0')}</div>
                            <div className="fee-countdown-unit">Mins</div>
                          </div>
                          <div className="fee-countdown-sep">:</div>
                          <div className="fee-countdown-box">
                            <div className="fee-countdown-val">{String(countdown.secs).padStart(2, '0')}</div>
                            <div className="fee-countdown-unit">Secs</div>
                          </div>
                        </div>
                      ) : (
                        <div className="fee-expired-msg">
                          ⚠️ Submission deadline has passed! Contact admin for late fee payment.
                        </div>
                      )}
                    </>
                  )}

                  <div className="fee-panel-actions">
                    {!feeIsPaid && (
                      <a
                        href="https://mybbd.in/fee-payment?type=BBDU"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary fee-pay-btn"
                      >
                        💳 Pay Fees Online
                      </a>
                    )}
                    {/* Demo toggle for testing */}
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '12px' }}
                      onClick={() => setFeeIsPaid(p => !p)}
                    >
                      {feeIsPaid ? 'Mark as Due (demo)' : 'Mark as Paid (demo)'}
                    </button>
                  </div>
                </div>

                {/* ─── Receipt Upload Section (Student) ─── */}
                {role === 'student' && (
                  <div style={{ marginTop: '24px', padding: '20px 24px', borderRadius: '14px', background: 'var(--color-card-bg, #fff)', border: '1px solid var(--color-border, rgba(0,0,0,0.1))' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800 }}>📤 Upload Payment Receipt</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>Upload your fee payment receipt (PDF/Image). It will be reviewed by admin to verify your payment.</p>
                    
                    {fees.filter(f => f.payment?.receiptStatus === 'pending').length > 0 && (
                      <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: '14px', fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>⏳ You have receipts awaiting admin review</div>
                    )}
                    {fees.filter(f => f.payment?.receiptStatus === 'approved').length > 0 && (
                      <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '14px', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>✅ Receipt approved — Fee marked as paid!</div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <input type="file" accept="image/*,.pdf" id="receipt-upload" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
                        const reader = new FileReader();
                        reader.onload = () => setReceiptFile({ base64: reader.result as string, name: file.name });
                        reader.readAsDataURL(file);
                      }} />
                      <label htmlFor="receipt-upload" style={{ padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #e53935)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>📎 Choose Receipt File</label>
                      {receiptFile && <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>📄 {receiptFile.name}</span>}
                      {receiptFile && (
                        <button onClick={async () => {
                          setUploadingReceipt('uploading');
                          try {
                            const unpaid = fees.find(f => f.status !== 'paid');
                            if (!unpaid) { toast.error('No unpaid fee found'); return; }
                            const res = await feeReceiptApi.upload({ feeStructureId: unpaid.id, receiptBase64: receiptFile.base64, receiptFileName: receiptFile.name });
                            if (res.success) { toast.success('Receipt uploaded! Awaiting admin review.'); setReceiptFile(null); loadData(); }
                            else toast.error(res.message || 'Upload failed');
                          } catch { toast.error('Upload error'); } finally { setUploadingReceipt(null); }
                        }} disabled={uploadingReceipt === 'uploading'} style={{ padding: '10px 20px', borderRadius: '10px', background: '#1a237e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                          {uploadingReceipt === 'uploading' ? '⏳ Uploading...' : '📤 Submit Receipt'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── Admin: Pending Receipts Review ─── */}
                {(role === 'admin' || role === 'faculty') && pendingReceipts.length > 0 && (
                  <div style={{ marginTop: '24px', padding: '20px 24px', borderRadius: '14px', background: 'var(--color-card-bg, #fff)', border: '1px solid rgba(251,191,36,0.3)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800 }}>📋 Pending Receipt Reviews ({pendingReceipts.length})</h3>
                    {pendingReceipts.map(pr => (
                      <div key={pr.id} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--color-border, rgba(0,0,0,0.1))', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>👤 {pr.student.fullName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{pr.student.email} · {pr.feeStructure.category} · ₹{pr.feeStructure.amount.toLocaleString()} · Sem {pr.feeStructure.semester}</div>
                          {pr.receiptFileName && <div style={{ fontSize: '12px', color: '#42a5f5', marginTop: '4px' }}>📄 {pr.receiptFileName}</div>}
                          {pr.receiptBase64 && (
                            <a href={pr.receiptBase64} download={pr.receiptFileName || 'receipt'} style={{ fontSize: '12px', color: '#42a5f5', textDecoration: 'underline', cursor: 'pointer' }}>⬇ Download Receipt</a>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={async () => { await feeReceiptApi.review(pr.id, 'approved'); toast.success('Approved!'); loadData(); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>✅ Approve</button>
                          <button onClick={async () => { await feeReceiptApi.review(pr.id, 'rejected'); toast.success('Rejected'); loadData(); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>❌ Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── FAQ Section ─── */}
                <div style={{ marginTop: '28px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>❓ Frequently Asked Questions</h3>
                  {[
                    { q: 'How do I pay my semester fee?', a: 'Click the "Pay Fees Online" button above to be redirected to the BBDU payment portal (mybbd.in). You can pay via Net Banking, UPI, Debit/Credit Card, or Challan.' },
                    { q: 'What happens after I upload a receipt?', a: 'Your receipt will be reviewed by the admin. Once approved, your fee status will automatically change to "Paid". You will see a green badge confirming approval.' },
                    { q: 'What if my receipt is rejected?', a: 'If rejected, you can upload a new receipt. Make sure the receipt clearly shows the transaction ID, amount, date, and your name/enrollment number.' },
                    { q: 'Can I pay the fee after the deadline?', a: 'Late fee payments may attract a penalty. Contact the Accounts Department or your class coordinator for guidance on late payments.' },
                    { q: 'I paid but my status still shows due. What should I do?', a: 'Upload your payment receipt using the button above. The admin will verify it and update your status. If the issue persists, visit the Accounts Section at the university with your payment proof.' },
                    { q: 'Is there a scholarship or fee waiver available?', a: 'Yes, BBD University offers merit-based scholarships and fee concessions. Contact the Scholarship Cell or visit bbdu.ac.in for eligibility criteria and application process.' },
                  ].map((faq, i) => (
                    <div key={i} style={{ marginBottom: '8px', borderRadius: '12px', border: '1px solid var(--color-border, rgba(0,0,0,0.1))', overflow: 'hidden' }}>
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '14px 18px', background: openFaq === i ? 'rgba(198,40,40,0.06)' : 'var(--color-card-bg, #fff)', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 700, color: 'inherit' }}>
                        <span>{faq.q}</span>
                        <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▼</span>
                      </button>
                      {openFaq === i && (
                        <div style={{ padding: '12px 18px 16px', fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-secondary, #666)', borderTop: '1px solid var(--color-border, rgba(0,0,0,0.06))' }}>{faq.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ CALENDAR TAB ═══ */}
            {tab === 'calendar' && (
              <div className="acad-section">
                {/* Sub-tab toggle */}
                <div className="cal-subtabs">
                  <button className={`cal-subtab${calView === 'academic' ? ' active' : ''}`} onClick={() => setCalView('academic')}>
                    📘 Academic Calendar
                  </button>
                  <button className={`cal-subtab${calView === 'holidays' ? ' active' : ''}`} onClick={() => setCalView('holidays')}>
                    🏖️ Holidays 2025
                  </button>
                </div>

                {calView === 'academic' && (
                  <>
                    <div className="cal-header-banner academic">
                      <div className="cal-header-title">Academic Calendar — Odd Semester</div>
                      <div className="cal-header-sub">Session 2025-26 · Applicable to all Programs except Dental Sciences</div>
                      <div className="cal-header-ref">Ref: BBDU/Reg./ADMIN/ACAD-CAL/159 · June 16, 2025</div>
                    </div>

                    <div className="cal-timeline">
                      {academicEvents.map((ev, i) => {
                        const isPast = ev.date ? new Date(ev.date) < new Date() : false;
                        return (
                          <div className={`cal-row${isPast ? ' past' : ''}`} key={i}>
                            <div className="cal-row-num">{i + 1}</div>
                            <div className="cal-row-body">
                              <div className="cal-row-title">{ev.title}</div>
                              {ev.detail && <div className="cal-row-detail">{ev.detail}</div>}
                            </div>
                            <div className="cal-row-date">{ev.dateStr}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {calView === 'holidays' && (
                  <>
                    <div className="cal-header-banner holiday">
                      <div className="cal-header-title">List of Holidays — Calendar Year 2025</div>
                      <div className="cal-header-sub">Office of the Chief Executive Director · BBD Educational Group</div>
                      <div className="cal-header-ref">BBD City, Ayodhya Road, Lucknow · December 18, 2024</div>
                    </div>

                    <div className="cal-holiday-table">
                      <div className="cal-holiday-head">
                        <div className="cal-h-no">#</div>
                        <div className="cal-h-name">Holiday</div>
                        <div className="cal-h-days">Days</div>
                        <div className="cal-h-date">Date</div>
                        <div className="cal-h-day">Day</div>
                      </div>
                      {holidays.map((h, i) => {
                        const isPast = h.date ? new Date(h.date) < new Date() : false;
                        return (
                          <div className={`cal-holiday-row${isPast ? ' past' : ''}`} key={i}>
                            <div className="cal-h-no">{i + 1}</div>
                            <div className="cal-h-name">{h.name}</div>
                            <div className="cal-h-days">
                              <span className="cal-days-pill">{String(h.numDays).padStart(2, '0')}</span>
                            </div>
                            <div className="cal-h-date">{h.dateStr}</div>
                            <div className="cal-h-day">{h.day}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
