import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import bbdLogo from '../assets/bbd-logo.png';
import { mockHostel } from '../services/mockApi';

// ─── API helpers (all routed through mockHostel / localStorage) ──
const hostelApi = {
  getMyRoom:        () => mockHostel.getMyRoom(),
  getBlocks:        () => mockHostel.getBlocks(),
  getRooms:         (_p?: string) => mockHostel.getRooms({}),
  getAllAllocations: (_s?: string) => mockHostel.getAllAllocations(),
  allocate:         (b: any) => mockHostel.allocateRoom(b),
  vacate:           (id: string) => mockHostel.vacateRoom(id),
  getGatePasses:    (s?: string) => mockHostel.getGatePasses(s ? { status: s } : {}),
  applyGatePass:    (b: any) => mockHostel.applyGatePass(b),
  updateGatePass:   (id: string, b: any) => mockHostel.updateGatePass(id, b),
  getMessMenu:      () => mockHostel.getMessMenu(),
  updateMessMenu:   (b: any) => mockHostel.updateMessMenu(b),
  getComplaints:    (s?: string, _t?: string) => mockHostel.getComplaints(s ? { status: s } : {}),
  fileComplaint:    (b: any) => mockHostel.fileComplaint(b),
  updateComplaint:  (id: string, b: any) => mockHostel.updateComplaint(id, b),
  getFees:          (s?: string) => mockHostel.getFees(s ? { status: s } : {}),
  createFee:        (b: any) => mockHostel.createFee(b),
  markFeePaid:      (id: string, ref: string) => mockHostel.markFeePaid(id, { paymentRef: ref }),
  getStats:         () => mockHostel.getStats(),
  searchStudents:   (q: string) => mockHostel.searchStudents(q),
};

// ─── Constants ──────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEALS = ['Breakfast','Lunch','Snacks','Dinner'];
const MEAL_TIMES: Record<string,string> = { Breakfast:'7:30–9:00 AM', Lunch:'12:30–2:00 PM', Snacks:'4:30–5:30 PM', Dinner:'7:30–9:00 PM' };
const COMPLAINT_TYPES = ['maintenance','electrical','plumbing','housekeeping','noise','food','security','other'];
const STATUS_COLOR: Record<string,string> = {
  pending:'#f59e0b', approved:'#22c55e', rejected:'#ef4444', returned:'#94a3b8',
  open:'#ef4444', in_progress:'#f59e0b', resolved:'#22c55e', closed:'#94a3b8',
  active:'#22c55e', vacated:'#94a3b8',
  paid:'#22c55e', overdue:'#ef4444', waived:'#94a3b8',
};
const PRIORITY_COLOR: Record<string,string> = { low:'#94a3b8', medium:'#f59e0b', high:'#ef4444', urgent:'#dc2626' };

export default function HostelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'admin' || user?.role === 'faculty';

  // ─── tabs ──────────────────────────────────────────────────────
  const STUDENT_TABS = ['My Room','Gate Pass','Mess Menu','Complaints','Fees'];
  const STAFF_TABS   = ['Overview','Rooms','Allocations','Gate Passes','Mess Menu','Complaints','Fees'];
  const TABS = isStaff ? STAFF_TABS : STUDENT_TABS;
  const [tab, setTab] = useState(TABS[0]);

  // ─── data state ─────────────────────────────────────────────────
  const [myRoom, setMyRoom] = useState<any>(null);
  const [myFees, setMyFees] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [messMenu, setMessMenu] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ─── form state ─────────────────────────────────────────────────
  // Gate pass
  const [gpPurpose, setGpPurpose] = useState('');
  const [gpDest, setGpDest] = useState('');
  const [gpOut, setGpOut] = useState('');
  const [gpReturn, setGpReturn] = useState('');
  const [gpRemarks, setGpRemarks] = useState('');
  // Complaint
  const [cType, setCType] = useState('maintenance');
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPriority, setCPriority] = useState('medium');
  // Resolve complaint
  const [resolveId, setResolveId] = useState('');
  const [resolution, setResolution] = useState('');
  // Mess menu edit
  const [editMenu, setEditMenu] = useState<{day:string,meal:string,items:string}|null>(null);
  // Allocate
  const [allocStudentQ, setAllocStudentQ] = useState('');
  const [allocStudents, setAllocStudents] = useState<any[]>([]);
  const [allocStudent, setAllocStudent] = useState<any>(null);
  const [allocRoomId, setAllocRoomId] = useState('');
  const [allocYear, setAllocYear] = useState('2025-26');
  // Fee
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feePeriod, setFeePeriod] = useState('2025-26 Semester 2');
  const [feeDue, setFeeDue] = useState('');
  const [feeType, setFeeType] = useState('hostel');

  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch on tab ───────────────────────────────────────────────
  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  async function loadTab(t: string) {
    setLoading(true);
    try {
      if (t === 'My Room') { const r = await hostelApi.getMyRoom(); if (r.success) { setMyRoom(r.data.allocation); setMyFees(r.data.fees || []); } }
      else if (t === 'Gate Pass') { const r = await hostelApi.getGatePasses(); if (r.success) setGatePasses(r.data); }
      else if (t === 'Mess Menu' || t === 'mess') { const r = await hostelApi.getMessMenu(); if (r.success) setMessMenu(r.data); }
      else if (t === 'Complaints') { const r = await hostelApi.getComplaints(); if (r.success) setComplaints(r.data); }
      else if (t === 'Fees') { const r = await hostelApi.getFees(); if (r.success) setFees(r.data); }
      else if (t === 'Overview') { const r = await hostelApi.getStats(); if (r.success) setStats(r.data); }
      else if (t === 'Rooms') { const [rb, rr] = await Promise.all([hostelApi.getBlocks(), hostelApi.getRooms()]); if (rb.success) setBlocks(rb.data); if (rr.success) setRooms(rr.data); }
      else if (t === 'Allocations') { const r = await hostelApi.getAllAllocations(); if (r.success) setAllocations(r.data); }
      else if (t === 'Gate Passes') { const r = await hostelApi.getGatePasses(); if (r.success) setGatePasses(r.data); }
      else if (t === 'Mess Menu') { const r = await hostelApi.getMessMenu(); if (r.success) setMessMenu(r.data); }
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }

  // ─── Actions ────────────────────────────────────────────────────
  async function submitGatePass() {
    if (!gpPurpose || !gpDest || !gpOut || !gpReturn) { toast.error('Fill all fields'); return; }
    setSubmitting(true);
    const r = await hostelApi.applyGatePass({ purpose: gpPurpose, destination: gpDest, outDateTime: gpOut, expectedReturn: gpReturn, studentRemarks: gpRemarks });
    if (r.success) { toast.success('Gate pass applied!'); setGpPurpose(''); setGpDest(''); setGpOut(''); setGpReturn(''); setGpRemarks(''); loadTab('Gate Pass'); }
    else toast.error(r.message || 'Failed');
    setSubmitting(false);
  }

  async function submitComplaint() {
    if (!cTitle || !cDesc) { toast.error('Fill title and description'); return; }
    setSubmitting(true);
    const r = await hostelApi.fileComplaint({ type: cType, title: cTitle, description: cDesc, priority: cPriority });
    if (r.success) { toast.success('Complaint filed!'); setCTitle(''); setCDesc(''); loadTab('Complaints'); }
    else toast.error(r.message || 'Failed');
    setSubmitting(false);
  }

  async function actionGatePass(id: string, status: string, remarks?: string) {
    const r = await hostelApi.updateGatePass(id, { status, remarks });
    if (r.success) { toast.success(`Gate pass ${status}`); loadTab(isStaff ? 'Gate Passes' : 'Gate Pass'); }
    else toast.error(r.message || 'Failed');
  }

  async function resolveComplaint(id: string, status: string) {
    if (!resolution && (status === 'resolved')) { toast.error('Add resolution note'); return; }
    const r = await hostelApi.updateComplaint(id, { status, resolution });
    if (r.success) { toast.success(`Complaint ${status}`); setResolveId(''); setResolution(''); loadTab('Complaints'); }
    else toast.error(r.message || 'Failed');
  }

  async function saveMessMenu() {
    if (!editMenu) return;
    const r = await hostelApi.updateMessMenu({ day: editMenu.day, meal: editMenu.meal, items: editMenu.items });
    if (r.success) { toast.success('Mess menu updated!'); setEditMenu(null); loadTab('Mess Menu'); }
    else toast.error('Failed');
  }

  async function doAllocate() {
    if (!allocStudent || !allocRoomId || !allocYear) { toast.error('Select student, room and year'); return; }
    setSubmitting(true);
    const r = await hostelApi.allocate({ studentId: allocStudent.id, roomId: allocRoomId, academicYear: allocYear });
    if (r.success) { toast.success(r.message); setAllocStudent(null); setAllocStudentQ(''); setAllocRoomId(''); loadTab('Allocations'); loadTab('Rooms'); }
    else toast.error(r.message || 'Failed');
    setSubmitting(false);
  }

  async function vacate(allocationId: string) {
    const r = await hostelApi.vacate(allocationId);
    if (r.success) { toast.success('Room vacated'); loadTab('Allocations'); }
    else toast.error('Failed');
  }

  async function createFeeRecord() {
    if (!feeStudentId || !feeAmount || !feePeriod || !feeDue) { toast.error('Fill all fee fields'); return; }
    setSubmitting(true);
    const r = await hostelApi.createFee({ studentId: feeStudentId, amount: feeAmount, feeType, period: feePeriod, dueDate: feeDue });
    if (r.success) { toast.success('Fee record created'); setFeeStudentId(''); setFeeAmount(''); setFeeDue(''); loadTab('Fees'); }
    else toast.error(r.message || 'Failed');
    setSubmitting(false);
  }

  async function payFee(id: string) {
    const ref = `PAY-${Date.now()}`;
    const r = await hostelApi.markFeePaid(id, ref);
    if (r.success) { toast.success('Marked as paid'); loadTab(isStaff ? 'Fees' : 'Fees'); }
    else toast.error('Failed');
  }

  async function searchAllocStudents(q: string) {
    setAllocStudentQ(q);
    if (q.length < 2) { setAllocStudents([]); return; }
    const r = await hostelApi.searchStudents(q);
    if (r.success) setAllocStudents(r.data);
  }

  // ─── Mess Menu grid ─────────────────────────────────────────────
  function getMenuItems(day: string, meal: string) {
    const entry = messMenu.find(m => m.day === day && m.meal === meal);
    return entry ? entry.items : null;
  }

  const fmtDt = (d: string) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  // ─── Render helpers ─────────────────────────────────────────────
  const Badge = ({ status, label }: { status: string; label?: string }) => (
    <span style={{ background: (STATUS_COLOR[status] || '#94a3b8') + '20', color: STATUS_COLOR[status] || '#94a3b8', border: `1px solid ${STATUS_COLOR[status] || '#94a3b8'}`, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
      {label || status}
    </span>
  );

  const PriorityBadge = ({ p }: { p: string }) => (
    <span style={{ background: (PRIORITY_COLOR[p] || '#94a3b8') + '20', color: PRIORITY_COLOR[p] || '#94a3b8', border: `1px solid ${PRIORITY_COLOR[p] || '#94a3b8'}`, padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{p}</span>
  );

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <h2>Smart Campus</h2>
        </div>
        <div className="user-info">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Page Header */}
        <div className="welcome-section">
          <h1>🏠 Hostel Management</h1>
          <p style={{ fontSize: '15px' }}>
            BBDU Campus Hostels · {isStaff ? 'Staff Control Panel' : 'Student Portal'}
          </p>
        </div>

        {/* Hostel Info Banner */}
        <div style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', borderRadius: '16px', padding: '20px 28px', marginBottom: '28px', color: '#fff', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', border: '2px solid #000' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '48px' }}>🏨</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '0.02em' }}>BBDU Campus Hostels</div>
              <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>📍 Babu Banarasi Das University Campus, Lucknow, UP — 226028</div>
              <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px' }}>🕐 Office: 8:00 AM – 10:00 PM · 📞 Ext: 2201 · Emergency: 1800-274-2201</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
              <div style={{ fontWeight: 900, fontSize: '18px' }}>6</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Blocks</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
              <div style={{ fontWeight: 900, fontSize: '18px' }}>1200</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Beds</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
              <div style={{ fontWeight: 900, fontSize: '18px' }}>24/7</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Security</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '2px solid #e0e0e0', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: tab === t ? '3px solid #C62828' : '3px solid transparent',
                background: 'none',
                fontWeight: tab === t ? 800 : 600,
                fontSize: '14px',
                color: tab === t ? '#C62828' : '#555',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >{t}</button>
          ))}
        </div>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="loading-spinner" style={{ width: '40px', height: '40px' }} /></div>}

        {!loading && (
          <div>

            {/* ── MY ROOM ─────────────────────────────────────── */}
            {tab === 'My Room' && (
              <div>
                {myRoom ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Room Card */}
                    <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px', gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Room</div>
                          <div style={{ fontSize: '32px', fontWeight: 900, color: '#1a237e', marginTop: '4px' }}>
                            {myRoom.room.block.name} — {myRoom.room.roomNumber}
                          </div>
                        </div>
                        <Badge status={myRoom.status} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {[
                          { label: 'Block', value: myRoom.room.block.name },
                          { label: 'Floor', value: `${myRoom.room.floor}${['st','nd','rd'][myRoom.room.floor-1]||'th'} Floor` },
                          { label: 'Type', value: myRoom.room.type },
                          { label: 'Capacity', value: `${myRoom.room.allocations.length}/${myRoom.room.capacity} occupants` },
                          { label: 'Academic Year', value: myRoom.academicYear },
                          { label: 'Check-in', value: fmtDate(myRoom.checkInDate) },
                          { label: 'Block Type', value: myRoom.room.block.type },
                          { label: 'Amenities', value: myRoom.room.amenities || 'Standard' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e', marginTop: '4px' }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {/* Roommates */}
                      {myRoom.room.allocations.length > 1 && (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#333', marginBottom: '12px' }}>👥 Roommates</div>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {myRoom.room.allocations.filter((a: any) => a.student.id !== user.id).map((a: any) => (
                              <div key={a.id} style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1a237e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px' }}>
                                  {a.student.fullName[0]}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{a.student.fullName}</div>
                                  <div style={{ fontSize: '12px', color: '#555' }}>{a.student.profile?.course} · Y{a.student.profile?.year}</div>
                                  {a.student.profile?.phone && <div style={{ fontSize: '12px', color: '#888' }}>📞 {a.student.profile.phone}</div>}
                                  {a.student.profile?.bloodGroup && <div style={{ fontSize: '12px', color: '#c62828' }}>🩸 {a.student.profile.bloodGroup}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fee Summary */}
                    <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px', gridColumn: '1 / -1' }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>💳 My Hostel Fees</div>
                      {myFees.length === 0 ? <p style={{ color: '#888' }}>No fee records</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {myFees.map(f => (
                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '14px' }}>{f.period} <span style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>· {f.feeType}</span></div>
                                <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>Due: {fmtDate(f.dueDate)}{f.paidDate ? ` · Paid: ${fmtDate(f.paidDate)}` : ''}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 900, fontSize: '18px', color: '#1a237e' }}>₹{f.amount.toLocaleString()}</span>
                                <Badge status={f.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', border: '2px solid #e0e0e0', borderRadius: '14px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏠</div>
                    <div style={{ fontWeight: 700, fontSize: '20px', color: '#333', marginBottom: '8px' }}>No Room Allocated Yet</div>
                    <p style={{ color: '#888', fontSize: '14px' }}>Contact the Hostel Warden to get a room assigned. Visit the office during 8 AM – 6 PM.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── GATE PASS ────────────────────────────────────── */}
            {(tab === 'Gate Pass') && (
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Apply Form */}
                {!isStaff && (
                  <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '18px' }}>📋 Apply for Gate Pass</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>PURPOSE</label>
                        <input className="form-input" placeholder="e.g. Home visit, medical..." value={gpPurpose} onChange={e => setGpPurpose(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>DESTINATION</label>
                        <input className="form-input" placeholder="e.g. Lucknow, Home - Kanpur..." value={gpDest} onChange={e => setGpDest(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>OUT DATE & TIME</label>
                        <input className="form-input" type="datetime-local" value={gpOut} onChange={e => setGpOut(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>EXPECTED RETURN</label>
                        <input className="form-input" type="datetime-local" value={gpReturn} onChange={e => setGpReturn(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>ADDITIONAL REMARKS (optional)</label>
                        <textarea className="form-input" rows={2} placeholder="Any extra info for warden..." value={gpRemarks} onChange={e => setGpRemarks(e.target.value)} />
                      </div>
                      <button className="btn btn-primary" onClick={submitGatePass} disabled={submitting}>
                        {submitting ? <span className="loading-spinner" style={{ width: '16px', height: '16px' }} /> : '🎫 Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pass List */}
                <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '18px' }}>
                    {isStaff ? '📋 All Gate Passes' : '📋 My Gate Passes'}
                  </h3>
                  {gatePasses.length === 0 ? <p style={{ color: '#888' }}>No gate passes found.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {gatePasses.map(gp => (
                        <div key={gp.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', background: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a2e' }}>{gp.purpose}</div>
                              {isStaff && <div style={{ fontSize: '12px', color: '#1a237e', fontWeight: 600 }}>{gp.student?.fullName} · {gp.student?.profile?.rollNumber}</div>}
                            </div>
                            <Badge status={gp.status} />
                          </div>
                          <div style={{ fontSize: '12px', color: '#555', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                            <span>📍 {gp.destination}</span>
                            <span>📤 Out: {fmtDt(gp.outDateTime)}</span>
                            <span>📥 Expected: {fmtDt(gp.expectedReturn)}</span>
                            {gp.actualReturn && <span>✅ Returned: {fmtDt(gp.actualReturn)}</span>}
                          </div>
                          {gp.studentRemarks && <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>💬 {gp.studentRemarks}</div>}
                          {gp.remarks && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>Warden: {gp.remarks}</div>}
                          {/* Actions */}
                          {isStaff && gp.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              <button style={{ padding: '5px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => actionGatePass(gp.id, 'approved')}>✓ Approve</button>
                              <button style={{ padding: '5px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => actionGatePass(gp.id, 'rejected', 'Rejected by warden')}>✗ Reject</button>
                            </div>
                          )}
                          {!isStaff && gp.status === 'approved' && (
                            <button style={{ marginTop: '10px', padding: '5px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => actionGatePass(gp.id, 'returned')}>📥 Mark Returned</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MESS MENU ─────────────────────────────────────── */}
            {(tab === 'Mess Menu') && (
              <div>
                <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px', overflowX: 'auto' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '18px' }}>🍽️ Weekly Mess Schedule</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: '#555', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid #e0e0e0' }}>Day</th>
                        {MEALS.map(m => (
                          <th key={m} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: '#555', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid #e0e0e0' }}>
                            {m}<br /><span style={{ fontWeight: 500, fontSize: '11px', color: '#aaa', textTransform: 'none' }}>{MEAL_TIMES[m]}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day, di) => (
                        <tr key={day} style={{ background: di % 2 === 0 ? '#f8fafc' : '#fff' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: '13px', borderBottom: '1px solid #e0e0e0', color: day === new Date().toLocaleDateString('en-US', { weekday: 'long' }) ? '#c62828' : '#1a1a2e' }}>
                            {day === new Date().toLocaleDateString('en-US', { weekday: 'long' }) ? `📅 ${day}` : day}
                          </td>
                          {MEALS.map(meal => {
                            const items = getMenuItems(day, meal);
                            return (
                              <td key={meal} style={{ padding: '10px 14px', borderBottom: '1px solid #e0e0e0', verticalAlign: 'top' }}>
                                {items ? (
                                  <div>
                                    {items.split('|').map((item: string, i: number) => (
                                      <div key={i} style={{ fontSize: '12px', color: '#333', padding: '2px 0' }}>• {item.trim()}</div>
                                    ))}
                                    {isStaff && (
                                      <button onClick={() => setEditMenu({ day, meal, items })} style={{ marginTop: '6px', fontSize: '11px', color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ color: '#aaa', fontSize: '12px' }}>
                                    Not set
                                    {isStaff && <button onClick={() => setEditMenu({ day, meal, items: '' })} style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>+ Add</button>}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Edit Menu Modal */}
                {editMenu && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '16px', padding: '28px', width: '460px' }}>
                      <h3 style={{ fontWeight: 800, marginBottom: '6px' }}>{editMenu.day} — {editMenu.meal}</h3>
                      <p style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>Enter items separated by | (pipe). e.g. Rice | Dal | Sabzi | Roti</p>
                      <textarea className="form-input" rows={4} value={editMenu.items} onChange={e => setEditMenu({ ...editMenu, items: e.target.value })} placeholder="Rice | Dal Tadka | Aloo Sabzi | Roti | Salad" />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                        <button className="btn btn-primary" onClick={saveMessMenu} style={{ flex: 1 }}>💾 Save</button>
                        <button className="btn btn-ghost" onClick={() => setEditMenu(null)} style={{ flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── COMPLAINTS ─────────────────────────────────────── */}
            {tab === 'Complaints' && (
              <div style={{ display: 'grid', gridTemplateColumns: isStaff ? '1fr' : '360px 1fr', gap: '20px', alignItems: 'start' }}>
                {!isStaff && (
                  <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '18px' }}>📝 File a Complaint</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>TYPE</label>
                        <select className="form-input" value={cType} onChange={e => setCType(e.target.value)}>
                          {COMPLAINT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>PRIORITY</label>
                        <select className="form-input" value={cPriority} onChange={e => setCPriority(e.target.value)}>
                          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>TITLE</label>
                        <input className="form-input" placeholder="Brief summary..." value={cTitle} onChange={e => setCTitle(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>DESCRIPTION</label>
                        <textarea className="form-input" rows={3} placeholder="Describe the issue in detail..." value={cDesc} onChange={e => setCDesc(e.target.value)} />
                      </div>
                      <button className="btn btn-primary" onClick={submitComplaint} disabled={submitting}>
                        {submitting ? <span className="loading-spinner" style={{ width: '16px', height: '16px' }} /> : '📨 Submit Complaint'}
                      </button>
                    </div>
                  </div>
                )}

                {/* List */}
                <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '18px' }}>{isStaff ? '📋 All Complaints' : '📋 My Complaints'}</h3>
                  {complaints.length === 0 ? <p style={{ color: '#888' }}>No complaints found.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {complaints.map(c => (
                        <div key={c.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', background: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{c.title}</span>
                              <PriorityBadge p={c.priority} />
                              <Badge status={c.status} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#888', background: '#e8edf4', padding: '2px 8px', borderRadius: '6px', textTransform: 'capitalize' }}>{c.type}</span>
                          </div>
                          {isStaff && <div style={{ fontSize: '12px', color: '#1a237e', fontWeight: 600, marginBottom: '4px' }}>{c.student?.fullName} · {c.student?.profile?.rollNumber}</div>}
                          <div style={{ fontSize: '13px', color: '#555' }}>{c.description}</div>
                          {c.resolution && <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '6px', fontStyle: 'italic' }}>✅ Resolution: {c.resolution}</div>}
                          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>{fmtDate(c.createdAt)}</div>

                          {/* Warden actions */}
                          {isStaff && (c.status === 'open' || c.status === 'in_progress') && (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {resolveId === c.id ? (
                                <div>
                                  <textarea className="form-input" rows={2} placeholder="Enter resolution details..." value={resolution} onChange={e => setResolution(e.target.value)} style={{ marginBottom: '8px' }} />
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button style={{ padding: '5px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => resolveComplaint(c.id, 'resolved')}>✅ Resolve</button>
                                    <button style={{ padding: '5px 14px', background: 'none', color: '#555', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setResolveId('')}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {c.status === 'open' && <button style={{ padding: '5px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => hostelApi.updateComplaint(c.id, { status: 'in_progress' }).then(() => loadTab('Complaints'))}>🔧 In Progress</button>}
                                  <button style={{ padding: '5px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setResolveId(c.id)}>✅ Resolve</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FEES ─────────────────────────────────────────────── */}
            {tab === 'Fees' && (
              <div>
                {isStaff && (
                  <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>💳 Create Fee Record</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>STUDENT ID</label>
                        <input className="form-input" placeholder="Student ID" value={feeStudentId} onChange={e => setFeeStudentId(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>AMOUNT (₹)</label>
                        <input className="form-input" type="number" placeholder="45000" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>FEE TYPE</label>
                        <select className="form-input" value={feeType} onChange={e => setFeeType(e.target.value)}>
                          {['hostel','mess','maintenance','security'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>PERIOD</label>
                        <input className="form-input" placeholder="2025-26 Semester 2" value={feePeriod} onChange={e => setFeePeriod(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>DUE DATE</label>
                        <input className="form-input" type="date" value={feeDue} onChange={e => setFeeDue(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={createFeeRecord} disabled={submitting} style={{ width: '100%' }}>
                          {submitting ? <span className="loading-spinner" style={{ width: '16px', height: '16px' }} /> : '+ Create Fee'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>{isStaff ? '💳 All Fee Records' : '💳 My Fees'}</h3>
                  {fees.length === 0 ? <p style={{ color: '#888' }}>No fee records.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {fees.map(f => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            {isStaff && <div style={{ fontWeight: 700, fontSize: '13px', color: '#1a237e' }}>{f.student?.fullName} <span style={{ color: '#888', fontWeight: 500 }}>· {f.student?.profile?.rollNumber}</span></div>}
                            <div style={{ fontWeight: 700, fontSize: '14px', marginTop: isStaff ? '2px' : '0' }}>{f.period} <span style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>· {f.feeType}</span></div>
                            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>Due: {fmtDate(f.dueDate)}{f.paidDate ? ` · Paid: ${fmtDate(f.paidDate)}` : ''}</div>
                            {f.paymentRef && <div style={{ fontSize: '11px', color: '#888' }}>Ref: {f.paymentRef}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '20px', color: '#1a237e' }}>₹{f.amount.toLocaleString()}</span>
                            <Badge status={f.status} />
                            {isStaff && f.status === 'pending' && (
                              <button style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => payFee(f.id)}>💳 Mark Paid</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── OVERVIEW (Staff) ──────────────────────────────── */}
            {tab === 'Overview' && stats && isStaff && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Active Blocks', value: stats.totalBlocks, icon: '🏢', color: '#1a237e' },
                    { label: 'Total Rooms', value: stats.totalRooms, icon: '🚪', color: '#1565c0' },
                    { label: 'Occupied Beds', value: stats.activeAllocations, icon: '🛏️', color: '#388e3c' },
                    { label: 'Pending Passes', value: stats.pendingPasses, icon: '🎫', color: '#f59e0b', urgent: stats.pendingPasses > 0 },
                    { label: 'Open Complaints', value: stats.openComplaints, icon: '📝', color: '#ef4444', urgent: stats.openComplaints > 0 },
                    { label: 'Urgent Issues', value: stats.urgentComplaints, icon: '🚨', color: '#dc2626', urgent: stats.urgentComplaints > 0 },
                    { label: 'Pending Fees', value: stats.pendingFees, icon: '💳', color: '#9c27b0' },
                    { label: 'Fee Dues Total', value: `₹${(stats.pendingFeeTotal || 0).toLocaleString()}`, icon: '💰', color: '#e65100' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: `2px solid ${s.urgent ? '#ef4444' : '#e0e0e0'}`, borderRadius: '14px', padding: '20px', textAlign: 'center', boxShadow: s.urgent ? `0 0 0 1px #ef444440` : 'none' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.icon}</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '12px', color: '#888', fontWeight: 600, marginTop: '4px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#1a237e', color: '#fff', borderRadius: '14px', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', border: '2px solid #000' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '10px' }}>📌 Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[['Allocate Room', 'Allocations'], ['Review Gate Passes', 'Gate Passes'], ['Update Mess Menu', 'Mess Menu'], ['Resolve Complaints','Complaints']].map(([label, t]) => (
                        <button key={label} onClick={() => setTab(t)} style={{ textAlign: 'left', padding: '10px 14px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                          {label} →
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '10px' }}>📞 Hostel Contacts</div>
                    {[
                      ['Chief Warden', '+91-522-XXX-XXXX'],
                      ['Admin Office', 'Ext: 2201'],
                      ['Security Room', 'Ext: 2299'],
                      ['Mess Supervisor', 'Ext: 2250'],
                      ['Maintenance', 'Ext: 2210'],
                    ].map(([role, num]) => (
                      <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }}>
                        <span style={{ opacity: 0.8 }}>{role}</span>
                        <span style={{ fontWeight: 700 }}>{num}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ROOMS (Staff) ──────────────────────────────────── */}
            {tab === 'Rooms' && isStaff && (
              <div>
                {blocks.map(block => (
                  <div key={block.id} style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '18px' }}>🏢 {block.name}</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', textTransform: 'capitalize' }}>
                          {block.type} Hostel · {block.totalFloors} Floors{block.wardenName ? ` · Warden: ${block.wardenName}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a237e', background: '#e8edf4', padding: '6px 14px', borderRadius: '20px' }}>
                        {rooms.filter(r => r.blockId === block.id).length} rooms
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {rooms.filter(r => r.blockId === block.id).map(room => {
                        const occupancy = room.allocations?.length || 0;
                        const full = occupancy >= room.capacity;
                        return (
                          <div key={room.id} style={{ background: full ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${full ? '#f87171' : '#86efac'}`, borderRadius: '10px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 800, fontSize: '15px' }}>{room.roomNumber}</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: full ? '#ef4444' : '#22c55e' }}>
                                {occupancy}/{room.capacity} beds
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#555', textTransform: 'capitalize' }}>Fl {room.floor} · {room.type}</div>
                            {room.amenities && <div style={{ fontSize: '10px', color: '#888', marginTop: '3px' }}>{room.amenities}</div>}
                            {room.allocations?.map((a: any) => (
                              <div key={a.id} style={{ fontSize: '11px', color: '#1a1a2e', marginTop: '4px', fontWeight: 600 }}>👤 {a.student?.fullName}</div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ALLOCATIONS (Staff) ────────────────────────────── */}
            {tab === 'Allocations' && isStaff && (
              <div>
                {/* Allocate Form */}
                <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>🛏️ Allocate a Room</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>STUDENT SEARCH</label>
                      <input className="form-input" placeholder="Name, email, roll..." value={allocStudentQ} onChange={e => searchAllocStudents(e.target.value)} />
                      {allocStudents.length > 0 && !allocStudent && (
                        <div style={{ position: 'absolute', background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, minWidth: '280px', marginTop: '4px' }}>
                          {allocStudents.map(s => (
                            <button key={s.id} onClick={() => { setAllocStudent(s); setAllocStudentQ(s.fullName); setAllocStudents([]); }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}>
                              <strong>{s.fullName}</strong> · {s.profile?.rollNumber || s.email}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>ROOM</label>
                      <select className="form-input" value={allocRoomId} onChange={e => setAllocRoomId(e.target.value)}>
                        <option value="">Select room...</option>
                        {blocks.map(b => (
                          <optgroup key={b.id} label={b.name}>
                            {rooms.filter(r => r.blockId === b.id && r.allocations?.length < r.capacity).map(r => (
                              <option key={r.id} value={r.id}>{r.roomNumber} (Fl {r.floor}) — {r.allocations?.length}/{r.capacity}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '5px' }}>ACADEMIC YEAR</label>
                      <input className="form-input" value={allocYear} onChange={e => setAllocYear(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={doAllocate} disabled={submitting} style={{ whiteSpace: 'nowrap' }}>
                      {submitting ? <span className="loading-spinner" style={{ width: '16px', height: '16px' }} /> : '🛏️ Allocate'}
                    </button>
                  </div>
                </div>

                {/* Allocation List */}
                <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>📋 Active Allocations</h3>
                  {allocations.length === 0 ? <p style={{ color: '#888' }}>No allocations found.</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                      {allocations.map(a => (
                        <div key={a.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px' }}>{a.student?.fullName}</div>
                              <div style={{ fontSize: '12px', color: '#555' }}>{a.student?.profile?.rollNumber} · {a.student?.profile?.course} Y{a.student?.profile?.year}</div>
                            </div>
                            <Badge status={a.status} />
                          </div>
                          <div style={{ fontSize: '12px', color: '#1a237e', fontWeight: 700, marginTop: '6px' }}>
                            🚪 {a.room?.block?.name} — Room {a.room?.roomNumber} (Fl {a.room?.floor})
                          </div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Check-in: {fmtDate(a.checkInDate)}</span>
                            <span>{a.academicYear}</span>
                          </div>
                          {a.status === 'active' && (
                            <button style={{ marginTop: '10px', padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }} onClick={() => vacate(a.id)}>
                              🚪 Vacate Room
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── GATE PASSES (Staff tab) ─────────────────────────── */}
            {tab === 'Gate Passes' && isStaff && (
              <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '14px', padding: '24px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '18px' }}>🎫 All Gate Passes</h3>
                {gatePasses.length === 0 ? <p style={{ color: '#888' }}>No gate passes.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gatePasses.map(gp => (
                      <div key={gp.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{gp.student?.fullName} <span style={{ color: '#888', fontWeight: 500 }}>· {gp.student?.profile?.rollNumber}</span></div>
                            <div style={{ fontSize: '13px', color: '#1a1a2e', marginTop: '2px' }}>{gp.purpose} → {gp.destination}</div>
                          </div>
                          <Badge status={gp.status} />
                        </div>
                        <div style={{ fontSize: '12px', color: '#555', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>📤 {fmtDt(gp.outDateTime)}</span>
                          <span>📥 Expected: {fmtDt(gp.expectedReturn)}</span>
                          {gp.actualReturn && <span>✅ Returned: {fmtDt(gp.actualReturn)}</span>}
                        </div>
                        {gp.studentRemarks && <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>💬 {gp.studentRemarks}</div>}
                        {gp.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button style={{ padding: '6px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => actionGatePass(gp.id, 'approved')}>✓ Approve</button>
                            <button style={{ padding: '6px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => actionGatePass(gp.id, 'rejected', 'Rejected')}>✗ Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
