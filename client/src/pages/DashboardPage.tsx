import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { noticeApi, profileApi } from '../services/api';
import toast from 'react-hot-toast';

// Import poster images
import poster1 from '../assets/poster-utkarsh.jpg';
import poster2 from '../assets/poster-founders-day.png';
import poster3 from '../assets/poster-convocation.png';

// Import founder portraits
import leaderBanarasi from '../assets/leader-banarasi-das.jpg';
import leaderAkhilesh from '../assets/leader-akhilesh-das.jpg';

// Campus background
import campusBg from '../assets/campus-bg.png';

// BBD University Logo
import bbdLogo from '../assets/bbd-logo.png';

const POSTERS = [
  { src: poster1, alt: 'UTKARSH 2026 — Virasat Se Vikas Tak' },
  { src: poster2, alt: "Founder's Day 2026 — Kanika Kapoor Live" },
  { src: poster3, alt: 'Convocation 2025' },
];

// ─── Leadership Data ──────────────────────────────────────────
const LEADERS = [
  {
    id: 1,
    photo: leaderBanarasi,
    name: 'Late Babu Banarasi Das Ji',
    title: 'Ex Chief Minister, Govt. of Uttar Pradesh',
    years: '1912 – 1985',
    tagline: 'Founder & Visionary',
    qualifications: '',
    positions: ['Ex Chief Minister', 'Govt. of Uttar Pradesh'],
    quote: '"To provide an open opportunity to the young generation for evolving their core competencies and to build their career as world-class professionals with broad based foundation, in-depth knowledge & versatile personality to meet the challenges of Global Economy…" – Babuji\'s Vision.',
    bio: `Babu Banarasi Das Ji, a born nationalist, in his early youth, joined hands with Mahatma Gandhi & Jawahar Lal Nehru in the movement to free India from the clutches of British rule.

During his long political career, he worked as a Minister, Speaker and Member of Parliament (both Lok Sabha and Rajya Sabha). He also held the position of the Chief Minister of Uttar Pradesh. His entire life was devoted to securing the dignity of individuals through selfless service to mankind. He was a humanitarian who enabled people to realize their goals.

He never believed in surrendering to any forces. Even in the face of death, he would not give in. "Man doth not yield himself to angels, not even unto death, utterly, saved, by the weakness of his feeble will." Babuji always led and inspired people through his example, leaving behind a legacy for future generations. We are privileged to inherit that legacy and perpetuate his memory.`,
  },
  {
    id: 2,
    photo: leaderAkhilesh,
    name: 'Dr. Akhilesh Das Gupta',
    title: "Hon'ble Founder Ex-Chairman, BBD Educational Society",
    years: '1961 – 2017',
    tagline: 'Founder Chairman',
    qualifications: 'MBA, LLB, Ph.D.',
    positions: ['Ex-Member of Parliament (Rajya Sabha)', "Hon'ble Founder Ex-Chairman, BBD Educational Society"],
    quote: '"We not only make technocrats at BBD, but we also churn out citizens of the world, perfect in all respect, be it leadership, competence, confidence, communication, moral or knowledge…" – Akhilesh Das Gupta\'s Vision.',
    bio: `A distinguished political leader, philanthropist, educationist and social worker, Dr. Akhilesh Das is the pride of Lucknow city. He has established himself as a worthy son of his illustrious father Late Babu Banarasi Das Ji.

**Public Life**
He has obtained MBA, LLB & Ph.D. (Human Resource Management) degrees. Dr. Akhilesh Das decided to follow his father's footprints by choosing Social Service as his primary goal. In his distinguished public life spanning well over three decades, Dr. Akhilesh Das was first elected as the Mayor of Lucknow in the year 1993 and became one of the youngest Mayors in the world. Subsequently, he was elected as a Member of Parliament (Rajya Sabha) in November 1996 and was re-elected for a second term in November 2002 till November 2008. Dr. Akhilesh Das was elected again as a Member of Parliament (Rajya Sabha) for a third consecutive term from 2008 to 2014.

**Contribution To Sports**
Dr. Akhilesh Das was an enthusiastic sportsperson. He represented and captained the U.P. State Badminton team for many years and won many National & International tournaments including the National Doubles Championship. He was the president of the U.P. Olympic Association & Chairman of the Badminton Association of India.

**Contribution To The Cause Of Education**
As a social thinker, Dr. Akhilesh Das realized the need for Quality Technical & Professional education for the overall growth and upliftment of the masses. Accordingly, Babu Banarasi Das Educational Society (BBDES) was founded through which the torch for higher professional education was lit in Lucknow. The first institution in the series, Babu Banarasi Das National Institute of Technology & Management (BBDNITM) was established in 1998.`,
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeLeader, setActiveLeader] = useState<typeof LEADERS[0] | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch avatar
  useEffect(() => {
    profileApi.getMyProfile().then(res => {
      if (res.success && res.data?.profile?.avatarBase64) {
        setAvatarUrl(res.data.profile.avatarBase64);
      }
    }).catch(() => {});
  }, []);

  // ─── Live Clock ─────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Notice Notification Polling ────────────────────────────
  const seenNoticeIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    let first = true;
    const poll = async () => {
      try {
        const res = await noticeApi.bulletin();
        if (res.success && res.data) {
          const notices = res.data as { id: string; title: string; category: string }[];
          if (first) {
            notices.forEach((n: any) => seenNoticeIds.current.add(n.id));
            first = false;
            return;
          }
          notices.forEach((n: any) => {
            if (!seenNoticeIds.current.has(n.id)) {
              seenNoticeIds.current.add(n.id);
              toast('📢 ' + n.title, { icon: '🔔', duration: 5000 });
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Smart Campus — New Notice', { body: n.title, icon: '🎓' });
              }
            }
          });
        }
      } catch { /* ignore polling errors */ }
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const { isDark, toggleTheme } = useTheme();

  if (!user) return null;

  const modules = [
    {
      icon: '🪪',
      title: 'Digital ID & Profile',
      desc: 'Your campus identity with QR code',
      bg: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))',
      status: 'active',
      statusText: 'Active',
      route: '/digital-id',
    },
    {
      icon: '📅',
      title: 'Attendance',
      desc: 'QR-based attendance tracking',
      bg: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(99,102,241,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/attendance',
    },
    {
      icon: '📢',
      title: 'Notices',
      desc: 'Campus-wide announcements',
      bg: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(251,191,36,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/notices',
    },
    {
      icon: '📊',
      title: 'Academics',
      desc: 'Marks, results, fee status',
      bg: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(34,211,238,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/academics',
    },
    {
      icon: '🧾',
      title: 'Complaints',
      desc: 'Hostel, transport, academic grievances',
      bg: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(244,114,182,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/complaints',
    },
    {
      icon: '🛡️',
      title: 'Anti-Ragging',
      desc: 'Report incidents, helpline contacts',
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,191,36,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/anti-ragging',
    },
    {
      icon: '📖',
      title: 'Classroom',
      desc: 'Section notes, faculty, classmates',
      bg: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(168,85,247,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/classroom',
    },
    {
      icon: '📚',
      title: 'Library',
      desc: 'Book issues, fines & catalogue',
      bg: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/library',
    },
    {
      icon: '🏠',
      title: 'Hostel',
      desc: 'Room, mess, gate passes & fees',
      bg: 'linear-gradient(135deg, rgba(26,35,126,0.15), rgba(21,101,192,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/hostel',
    },
    {
      icon: '🎉',
      title: 'Events',
      desc: 'Campus events, fests & club activities',
      bg: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(168,85,247,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/events',
    },
    {
      icon: '🔍',
      title: 'Lost & Found',
      desc: 'Report & reclaim lost items on campus',
      bg: 'linear-gradient(135deg, rgba(249,168,37,0.15), rgba(198,40,40,0.08))',
      status: 'active',
      statusText: 'Active',
      route: '/lost-found',
    },
    {
      icon: '🗺️',
      title: 'Navigation',
      desc: 'Live campus map, buildings & directions',
      bg: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(251,191,36,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/navigation',
    },
    {
      icon: '🏛️',
      title: 'Communities',
      desc: 'Campus clubs, forums & recruitment',
      bg: 'linear-gradient(135deg, rgba(26,35,126,0.2), rgba(63,81,181,0.12))',
      status: 'active',
      statusText: 'Active',
      route: '/communities',
    },
    {
      icon: '👔',
      title: 'Management',
      desc: 'Deans, HODs & leadership directory',
      bg: 'linear-gradient(135deg, rgba(121,85,72,0.2), rgba(78,52,46,0.12))',
      status: 'active',
      statusText: 'Active',
      route: '/management',
    },
    {
      icon: '💬',
      title: 'Chat',
      desc: 'Message students & faculty directly',
      bg: 'linear-gradient(135deg, rgba(0,150,136,0.15), rgba(0,121,107,0.1))',
      status: 'active',
      statusText: 'Active',
      route: '/chat',
    },

  ];

  const roleEmoji: Record<string, string> = { student: '🎓', faculty: '👨‍🏫', admin: '🛠️' };

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <h2>Smart Campus</h2>
        </div>

        <div className="user-info">
          <a
            href="https://bbdu.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ fontWeight: 700, color: '#fff' }}
          >
            🌐 University Website
          </a>
          <span className={`role-badge ${user.role}`}>
            {roleEmoji[user.role]} {user.role}
          </span>
          {user.role === 'admin' && (
            <button className="btn btn-ghost" onClick={() => navigate('/admin/users')}>
              👥 Users
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ fontSize: '18px', padding: '4px 10px' }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <div
            className="header-avatar-btn"
            onClick={() => navigate('/profile')}
            title="My Profile"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" />
            ) : (
              <span>{user.fullName?.charAt(0)?.toUpperCase() || '?'}</span>
            )}
          </div>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main
        className="dashboard-main"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(rgba(15,17,23,0.95), rgba(15,17,23,0.95)), url(${campusBg})`
            : `linear-gradient(rgba(240,242,245,0.93), rgba(240,242,245,0.93)), url(${campusBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Live Date/Time Widget */}
        <div className="datetime-widget">
          <div className="datetime-clock">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="datetime-date">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* 1. Featured Poster Carousel */}
        <FeaturedCarousel />

        {/* 2. Notice Ticker */}
        <BulletinTicker />

        {/* 3. Our Visionary Founders */}
        <div className="founders-section">
          <h2 className="founders-heading">Our Visionary Founders</h2>
          <div className="founders-grid">
            {LEADERS.map((leader) => (
              <div
                className="founder-card"
                key={leader.id}
                onClick={() => setActiveLeader(leader)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveLeader(leader)}
              >
                <div className="founder-photo-wrap">
                  <img src={leader.photo} alt={leader.name} className="founder-photo" />
                  <div className="founder-overlay" />
                </div>
                <div className="founder-info">
                  <div className="founder-name">{leader.name}</div>
                  <div className="founder-years">{leader.years}</div>
                  <div className="founder-tagline">{leader.tagline}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leader Modal */}
        {activeLeader && (
          <LeaderModal leader={activeLeader} onClose={() => setActiveLeader(null)} />
        )}

        {/* 4. Module Grid */}
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '20px', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          Campus Modules
        </h2>
        <div className="dashboard-grid">
          {modules.map((mod, i) => (
            <div
              key={i}
              className={`dashboard-card${mod.route ? ' card-active' : ''}`}
              style={{ animationDelay: `${i * 0.06}s`, cursor: mod.route ? 'pointer' : 'default' }}
              onClick={() => mod.route && navigate(mod.route)}
            >
              <div className="card-icon" style={{ background: mod.bg, animationDelay: `${i * 0.4}s` }}>
                {mod.icon}
              </div>
              <h3>{mod.title}</h3>
              <p>{mod.desc}</p>
              <div className="card-status">
                <div className={`status-dot ${mod.status}`} />
                <span style={{
                  color: mod.status === 'active'
                    ? 'var(--color-success)'
                    : mod.status === 'coming'
                    ? 'var(--color-warning)'
                    : 'var(--color-text-muted)'
                }}>
                  {mod.statusText}
                </span>
                {mod.route && <span style={{ marginLeft: 'auto', fontSize: '18px', fontWeight: 900, color: 'var(--color-header-bg)' }}>→</span>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Featured Poster Carousel ────────────────────────────────────
function FeaturedCarousel() {
  const [current, setCurrent] = useState(0);
  const total = POSTERS.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="carousel-section">
      <div className="carousel-container">
        {/* Left Arrow */}
        <button className="carousel-arrow carousel-arrow-left" onClick={prev} aria-label="Previous slide">
          ‹
        </button>

        {/* Slides */}
        <div className="carousel-viewport">
          {POSTERS.map((poster, i) => (
            <div
              key={i}
              className={`carousel-slide ${i === current ? 'active' : ''}`}
            >
              <img src={poster.src} alt={poster.alt} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button className="carousel-arrow carousel-arrow-right" onClick={next} aria-label="Next slide">
          ›
        </button>
      </div>

      {/* Dot indicators */}
      <div className="carousel-dots">
        {POSTERS.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot ${i === current ? 'active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Bulletin Ticker (News-channel style) ────────────────────────
function BulletinTicker() {
  const [headlines, setHeadlines] = useState<{ id: string; title: string; category: string }[]>([]);

  useEffect(() => {
    noticeApi.bulletin()
      .then((res: any) => { if (res.success) setHeadlines(res.data || []); })
      .catch(() => {});
  }, []);

  if (headlines.length === 0) {
    return (
      <div className="bulletin-bar">
        <div className="bulletin-label">📢 NOTICES</div>
        <div className="bulletin-track">
          <span className="bulletin-item">No notices yet — check back soon!</span>
        </div>
      </div>
    );
  }

  const items = [...headlines, ...headlines];

  return (
    <div className="bulletin-bar">
      <div className="bulletin-label">📢 NOTICES</div>
      <div className="bulletin-track">
        <div className="bulletin-scroll">
          {items.map((h, i) => (
            <span key={`${h.id}-${i}`} className="bulletin-item">
              {h.category === 'urgent' && <span className="bulletin-urgent">🚨</span>}
              {h.title}
              <span className="bulletin-sep">●</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Leader Modal ─────────────────────────────────────────────────
function LeaderModal({ leader, onClose }: { leader: typeof LEADERS[0]; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Parse bio: split on **Heading** markers into sections
  const renderBio = (bio: string) => {
    const lines = bio.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="lmodal-section-title">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="lmodal-bio-para">{line}</p>;
    });
  };

  return (
    <div className="lmodal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lmodal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lmodal-header">
          <div className="lmodal-header-photo">
            <img src={leader.photo} alt={leader.name} />
          </div>
          <div className="lmodal-header-info">
            <h2 className="lmodal-name">{leader.name}</h2>
            <div className="lmodal-years">{leader.years}</div>
            {leader.qualifications && (
              <div className="lmodal-quals">{leader.qualifications}</div>
            )}
            {leader.positions.map((pos, i) => (
              <div key={i} className="lmodal-position">{pos}</div>
            ))}
          </div>
          <button className="lmodal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Vision Quote */}
        <blockquote className="lmodal-quote">
          {leader.quote}
        </blockquote>

        {/* Biography */}
        <div className="lmodal-bio">
          {renderBio(leader.bio)}
        </div>
      </div>
    </div>
  );
}
