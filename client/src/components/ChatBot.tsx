import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

// ─── Module Knowledge Base ────────────────────────────────────────
interface Intent {
  keywords: string[];
  route?: string;
  reply: string;
}

const INTENTS: Intent[] = [
  // Navigation to modules
  { keywords: ['dashboard', 'home', 'main page', 'go back'],
    route: '/dashboard', reply: '🏠 Taking you to the Dashboard!' },
  { keywords: ['profile', 'my profile', 'edit profile', 'my info', 'personal info'],
    route: '/profile', reply: '👤 Opening your Profile page!' },
  { keywords: ['digital id', 'id card', 'student id', 'qr code', 'identity card'],
    route: '/digital-id', reply: '🪪 Opening your Digital ID card!' },
  { keywords: ['attendance', 'my attendance', 'check attendance', 'attendance percentage', 'present absent'],
    route: '/attendance', reply: '📅 Opening Attendance tracker! You can view your QR-based attendance here.' },
  { keywords: ['notice', 'notices', 'bulletin', 'announcement', 'announcements', 'circular'],
    route: '/notices', reply: '📢 Opening Notices & Bulletin! Check the latest university announcements.' },
  { keywords: ['academic', 'academics', 'marks', 'results', 'grades', 'gpa', 'cgpa', 'fee', 'fees', 'fee status'],
    route: '/academics', reply: '📊 Opening Academics! View your marks, results, and fee status.' },
  { keywords: ['ragging', 'anti ragging', 'anti-ragging', 'bully', 'harassment', 'helpline'],
    route: '/anti-ragging', reply: '🛡️ Opening Anti-Ragging portal. If you\'re facing any issues, please report immediately.' },
  { keywords: ['complaint', 'complaints', 'grievance', 'issue', 'report issue', 'problem'],
    route: '/complaints', reply: '📝 Opening Complaints portal! Submit hostel, transport, or academic grievances.' },
  { keywords: ['classroom', 'class', 'section', 'classmates', 'classmate', 'teacher', 'faculty list'],
    route: '/classroom', reply: '🏫 Opening Classroom! View your section, notes, and classmates.' },
  { keywords: ['library', 'book', 'books', 'borrow', 'return book', 'catalogue', 'fine', 'library fine'],
    route: '/library', reply: '📚 Opening Library! Search books, check borrowed items, and manage fines.' },
  { keywords: ['hostel', 'room', 'mess', 'mess menu', 'gate pass', 'warden', 'hostel complaint', 'room allocation'],
    route: '/hostel', reply: '🏠 Opening Hostel Management! Rooms, gate passes, mess menu, and more.' },
  { keywords: ['event', 'events', 'fest', 'club', 'cultural', 'technical fest', 'workshop', 'seminar'],
    route: '/events', reply: '🎉 Opening Events! Browse campus events, fests, and club activities.' },
  { keywords: ['lost', 'found', 'lost and found', 'lost item', 'found item', 'missing'],
    route: '/lost-found', reply: '🔍 Opening Lost & Found! Report or find missing items on campus.' },
  { keywords: ['map', 'navigation', 'navigate', 'directions', 'where is', 'location', 'campus map', 'building'],
    route: '/navigation', reply: '🗺️ Opening Campus Navigation! Find buildings and get walking directions.' },
  { keywords: ['community', 'communities', 'club', 'forum', 'ieee', 'aaina', 'innosphere', 'recruitment'],
    route: '/communities', reply: '🏛️ Opening Communities! Browse campus clubs, forums, and check recruitment status.' },
  { keywords: ['management', 'dean', 'hod', 'head of department', 'director', 'leadership'],
    route: '/management', reply: '👔 Opening Management Directory! View Deans, HODs, and their office details.' },
  { keywords: ['chat', 'message', 'dm', 'direct message', 'text', 'inbox'],
    route: '/chat', reply: '💬 Opening Chat! Search users and send direct messages.' },
  { keywords: ['admin', 'users', 'manage users', 'user management'],
    route: '/admin/users', reply: '👥 Opening Admin User Management!' },

  // Campus info (no navigation)
  { keywords: ['library hours', 'library timing', 'library time', 'when library'],
    reply: '📚 The Central Library is open from 8:00 AM to 9:00 PM, Monday to Saturday.' },
  { keywords: ['canteen', 'food', 'eat', 'lunch', 'breakfast', 'snacks'],
    reply: '🍽️ The Main Canteen serves breakfast (8–10 AM), lunch (12–2 PM), and snacks (4–6 PM). You can also check the mess menu in the Hostel module!' },
  { keywords: ['parking', 'park', 'vehicle'],
    reply: '🅿️ Main Parking is near Gate 1 (Main Gate). Faculty parking is near the Admin block. Open the 🗺️ Navigation module to see exact locations!' },
  { keywords: ['health', 'medical', 'doctor', 'clinic', 'ambulance', 'hospital'],
    reply: '🏥 The Campus Health Center is open 24/7 with a duty doctor and ambulance on standby. Use Navigation to find it!' },
  { keywords: ['contact', 'phone', 'email', 'university number', 'helpline number'],
    reply: '📞 BBD University Helpline: +91-522-3911111\n📧 Email: info@bbdu.ac.in\n🌐 Website: bbdu.ac.in' },
  { keywords: ['principal', 'vice chancellor', 'vc', 'dean', 'registrar'],
    reply: '🏛️ For administrative queries, visit the Main Administrative Building (Block A). You can also check the university website at bbdu.ac.in/administration.' },
  { keywords: ['bus', 'transport', 'shuttle', 'route'],
    reply: '🚌 Campus transport info is available at the Main Gate security office. Contact the transport desk for route schedules.' },
  { keywords: ['exam', 'examination', 'exam schedule', 'hall ticket', 'datesheet'],
    reply: '📝 Check the Notices module for exam datesheets and hall ticket info. The Examination Cell is in the Admin building.' },
  { keywords: ['placement', 'job', 'career', 'internship', 'company'],
    reply: '💼 Placement information is managed by the Training & Placement Cell. Check Notices for upcoming company drives!' },
  { keywords: ['sports', 'ground', 'gym', 'cricket', 'football', 'basketball'],
    reply: '⚽ Sports Ground: Cricket, football, 200m track. Indoor Complex: Badminton, TT, basketball, gym. Open the 🗺️ Navigation to find them!' },
  { keywords: ['wifi', 'internet', 'network', 'password'],
    reply: '📶 Campus WiFi: Connect to "BBDU-Campus". For login credentials, contact the IT helpdesk in Block A, Room 102.' },

  // Fun / conversational
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    reply: '👋 Hey there! I\'m your Smart Campus assistant. Ask me anything — where to find buildings, check attendance, report issues, or navigate the campus!' },
  { keywords: ['thank', 'thanks', 'thank you', 'appreciate'],
    reply: '😊 You\'re welcome! Happy to help. Anything else you need?' },
  { keywords: ['bye', 'goodbye', 'see you', 'later'],
    reply: '👋 See you later! Remember, I\'m always here if you need help navigating the campus.' },
  { keywords: ['joke', 'funny', 'tell me a joke'],
    reply: '😄 Why did the student bring a ladder to class? Because they wanted to reach higher education! 🎓' },
  { keywords: ['who are you', 'what are you', 'your name', 'who made you'],
    reply: '🤖 I\'m the Smart Campus AI Assistant! I help you navigate the campus, find modules, and answer common questions. Built with ❤️ for BBD University.' },
  { keywords: ['help', 'what can you do', 'commands', 'options'],
    reply: '🤖 I can help you with:\n\n📍 Navigate to any module (try "attendance", "library", "hostel")\n🗺️ Find campus buildings (try "where is canteen")\n📚 Campus info (try "library hours", "wifi", "contact")\n🎉 Events & activities\n📝 Complaints & reports\n\nJust type what you need!' },
];

// Best-match intent finder
function findIntent(input: string): Intent | null {
  const q = input.toLowerCase().trim();
  if (!q) return null;

  let best: Intent | null = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (q.includes(kw)) {
        // Longer keyword matches are more specific → higher score
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return bestScore > 0 ? best : null;
}

// ─── Suggested Quick Actions ──────────────────────────────────────
const QUICK_ACTIONS = [
  { label: '📅 Attendance', query: 'attendance' },
  { label: '📚 Library', query: 'library' },
  { label: '🗺️ Navigate', query: 'campus map' },
  { label: '📢 Notices', query: 'notices' },
  { label: '🏠 Hostel', query: 'hostel' },
  { label: '🎉 Events', query: 'events' },
  { label: '❓ Help', query: 'help' },
];

interface Message {
  id: number;
  text: string;
  from: 'user' | 'bot';
  route?: string;
}

// ═══════════════════════════════════════════════════════════════════
// CHATBOT COMPONENT
// ═══════════════════════════════════════════════════════════════════
const WELCOME_MSG: Message = {
  id: 0, text: '👋 Hi! I\'m your Smart Campus assistant.\n\nAsk me anything — "where is the library?", "check attendance", "report a complaint", or just say "help" to see what I can do!', from: 'bot',
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const msgId = useRef(1);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = useCallback((text?: string) => {
    const q = (text || input).trim();
    if (!q) return;

    const userMsg: Message = { id: msgId.current++, text: q, from: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const intent = findIntent(q);
      let botMsg: Message;

      if (intent) {
        botMsg = { id: msgId.current++, text: intent.reply, from: 'bot', route: intent.route };
      } else {
        botMsg = {
          id: msgId.current++,
          text: `🤔 I\'m not sure about that. Try asking about:\n• Campus modules (attendance, library, hostel)\n• Locations (canteen, parking, health center)\n• Services (wifi, transport, placement)\n\nOr type "help" for all options!`,
          from: 'bot',
        };
      }

      setTyping(false);
      setMessages(prev => [...prev, botMsg]);
    }, 500 + Math.random() * 500);
  }, [input]);

  const handleNavigate = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const bg = isDark ? '#1a1d27' : '#fff';
  const bgChat = isDark ? '#0f1117' : '#f4f6fa';
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textPrimary = isDark ? '#e8eaf0' : '#1a1a2e';
  const textSecondary = isDark ? '#a0a8b8' : '#555';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setOpen(o => {
            if (o) {
              // Closing — reset conversation
              setMessages([WELCOME_MSG]);
              setInput('');
              setTyping(false);
              msgId.current = 1;
            }
            return !o;
          });
        }}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #C62828, #e53935)',
          border: 'none', boxShadow: '0 4px 20px rgba(198,40,40,0.4)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = open ? 'rotate(90deg) scale(1.1)' : 'scale(1.1)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = open ? 'rotate(90deg)' : 'scale(1)'; }}
        title="Smart Campus Assistant"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '96px', right: '24px', zIndex: 9998,
          width: '380px', maxHeight: '550px', borderRadius: '20px',
          background: bg, border: `2px solid ${border}`,
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'chatSlideUp 0.3s ease-out',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #C62828, #d32f2f)',
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤖</div>
            <div>
              <div style={{ fontWeight: 900, color: '#fff', fontSize: '14px' }}>Campus Assistant</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>🟢 Online · Ask me anything</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px',
            background: bgChat, minHeight: '280px', maxHeight: '380px',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                <div style={{
                  padding: '10px 14px', borderRadius: msg.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.from === 'user'
                    ? 'linear-gradient(135deg, #C62828, #e53935)'
                    : isDark ? '#252834' : '#fff',
                  color: msg.from === 'user' ? '#fff' : textPrimary,
                  fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-line',
                  boxShadow: msg.from === 'user' ? 'none' : `0 1px 4px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}`,
                  border: msg.from === 'user' ? 'none' : `1px solid ${border}`,
                }}>
                  {msg.text}
                </div>
                {msg.route && (
                  <button
                    onClick={() => handleNavigate(msg.route!)}
                    style={{
                      alignSelf: 'flex-start', padding: '5px 12px', borderRadius: '8px',
                      background: 'rgba(41,121,255,0.1)', color: '#2979FF',
                      border: '1px solid rgba(41,121,255,0.2)',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    🚀 Go there now →
                  </button>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: '14px 14px 14px 4px', background: isDark ? '#252834' : '#fff', border: `1px solid ${border}`, display: 'flex', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', animation: 'dotBounce 1.2s infinite 0s' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', animation: 'dotBounce 1.2s infinite 0.2s' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', animation: 'dotBounce 1.2s infinite 0.4s' }} />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '6px 12px', display: 'flex', gap: '4px', flexWrap: 'wrap', borderTop: `1px solid ${border}`, background: bg }}>
            {QUICK_ACTIONS.map(a => (
              <button key={a.label} onClick={() => handleSend(a.query)} style={{
                padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                background: isDark ? '#252834' : '#f0f2f5', color: textSecondary,
                border: `1px solid ${border}`, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{a.label}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${border}`, display: 'flex', gap: '8px', background: bg }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything…"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '12px', fontSize: '13px',
                border: `1px solid ${border}`, outline: 'none',
                background: isDark ? '#252834' : '#f4f6fa', color: textPrimary,
              }}
            />
            <button onClick={() => handleSend()} style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #C62828, #e53935)',
              border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>➤</button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
