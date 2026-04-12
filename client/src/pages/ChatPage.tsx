import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserResult { id: string; fullName: string; role: string; profile?: { year?: number; section?: string; course?: string; avatarBase64?: string } }
interface Participant { id: string; userId: string; user: { id: string; fullName: string; profile?: { avatarBase64?: string; year?: number; section?: string } } }
interface Convo { id: string; participants: Participant[]; messages: { content: string; sentAt: string; senderId: string }[] }
interface Msg { id: string; content: string; senderId: string; sentAt: string; isRead: boolean; sender: { id: string; fullName: string } }

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myId = user?.id || '';
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadConvos = useCallback(async () => {
    try { const r = await chatApi.getConversations(); if (r.data) setConvos(r.data); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  const loadMessages = useCallback(async (convoId: string) => {
    try { const r = await chatApi.getMessages(convoId); if (r.data) setMessages(r.data); } catch {}
  }, []);

  useEffect(() => {
    if (activeConvo) {
      loadMessages(activeConvo);
      pollRef.current = setInterval(() => loadMessages(activeConvo), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConvo, loadMessages]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSearch = async () => {
    const params: any = {};
    if (search.trim()) params.name = search.trim();
    if (yearFilter) params.year = yearFilter;
    if (sectionFilter) params.section = sectionFilter;
    try { const r = await chatApi.searchUsers(params); if (r.data) setSearchResults(r.data); } catch {}
  };

  useEffect(() => { if (showSearch) handleSearch(); }, [search, yearFilter, sectionFilter, showSearch]);

  const startChat = async (targetId: string) => {
    try {
      const r = await chatApi.startConversation(targetId);
      if (r.data) { setShowSearch(false); setActiveConvo(r.data.id); loadConvos(); }
    } catch {}
  };

  const sendMsg = async () => {
    if (!msgInput.trim() || !activeConvo) return;
    try { await chatApi.sendMessage(activeConvo, msgInput.trim()); setMsgInput(''); loadMessages(activeConvo); loadConvos(); } catch {}
  };

  const blockUser = async (userId: string) => {
    if (!confirm('Block this user? You won\'t be able to message each other.')) return;
    try { await chatApi.blockUser(userId); loadConvos(); setActiveConvo(null); } catch {}
  };

  const getOtherUser = (c: Convo) => c.participants.find(p => p.userId !== myId)?.user;
  const activeOther = activeConvo ? getOtherUser(convos.find(c => c.id === activeConvo)!) : null;

  const formatTime = (d: string) => { const dt = new Date(d); return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  const formatDate = (d: string) => { const dt = new Date(d); const today = new Date(); return dt.toDateString() === today.toDateString() ? 'Today' : dt.toLocaleDateString(); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <span style={{ color: '#fff', fontSize: '22px', fontWeight: 900 }}>💬 Messages</span>
        </div>
        <button onClick={() => { setShowSearch(true); setSearchResults([]); setSearch(''); setYearFilter(''); setSectionFilter(''); }} style={{ padding: '8px 18px', borderRadius: '10px', background: '#fff', color: '#C62828', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>+ New Chat</button>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left — Conversations */}
        <div style={{ width: '320px', borderRight: '1px solid var(--color-border, rgba(0,0,0,0.1))', overflowY: 'auto', background: 'var(--color-card-bg, #fff)' }}>
          {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>}
          {!loading && convos.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>No conversations yet.<br />Click "+ New Chat" to start.</div>}
          {convos.map(c => {
            const other = getOtherUser(c);
            const lastMsg = c.messages[0];
            const isActive = activeConvo === c.id;
            return (
              <div key={c.id} onClick={() => setActiveConvo(c.id)} style={{ padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', background: isActive ? 'rgba(198,40,40,0.15)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#252834', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, overflow: 'hidden' }}>
                  {other?.profile?.avatarBase64 ? <img src={other.profile.avatarBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e8eaf0', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{other?.fullName || 'User'}</div>
                  <div style={{ color: '#636b7e', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg ? lastMsg.content : 'No messages yet'}</div>
                </div>
                {lastMsg && <div style={{ color: '#636b7e', fontSize: '10px', flexShrink: 0 }}>{formatTime(lastMsg.sentAt)}</div>}
              </div>
            );
          })}
        </div>

        {/* Right — Messages */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '16px' }}>Select a conversation or start a new one</div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#13151d' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#252834', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {activeOther?.profile?.avatarBase64 ? <img src={activeOther.profile.avatarBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>👤</span>}
                  </div>
                  <div>
                    <div style={{ color: '#e8eaf0', fontWeight: 700, fontSize: '14px' }}>{activeOther?.fullName || 'User'}</div>
                    <div style={{ color: '#636b7e', fontSize: '11px' }}>
                      {activeOther?.profile?.year ? `Year ${activeOther.profile.year}` : ''} {activeOther?.profile?.section ? `· Sec ${activeOther.profile.section}` : ''}
                    </div>
                  </div>
                </div>
                <button onClick={() => activeOther && blockUser(activeOther.id)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,82,82,0.1)', color: '#ef5350', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>🚫 Block</button>
              </div>

              {/* Message area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((m, i) => {
                  const isMine = m.senderId === myId;
                  const showDate = i === 0 || formatDate(messages[i - 1].sentAt) !== formatDate(m.sentAt);
                  return (
                    <div key={m.id}>
                      {showDate && <div style={{ textAlign: 'center', color: '#636b7e', fontSize: '11px', margin: '12px 0', fontWeight: 700 }}>{formatDate(m.sentAt)}</div>}
                      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMine ? 'linear-gradient(135deg, #C62828, #e53935)' : '#1e2130', color: isMine ? '#fff' : '#e8eaf0', fontSize: '13px', lineHeight: 1.5, border: isMine ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                          {m.content}
                          <div style={{ fontSize: '10px', color: isMine ? 'rgba(255,255,255,0.6)' : '#636b7e', marginTop: '4px', textAlign: 'right' }}>{formatTime(m.sentAt)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', background: '#13151d' }}>
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Type a message…" style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)', background: '#1e2130', color: '#e8eaf0', outline: 'none' }} />
                <button onClick={sendMsg} style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #C62828, #e53935)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search modal */}
      {showSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }} onClick={() => setShowSearch(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1d27', borderRadius: '18px', padding: '28px', width: '460px', maxHeight: '75vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: '#fff', margin: '0 0 16px', fontWeight: 900, fontSize: '18px' }}>🔍 Find Users</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', marginBottom: '10px' }} />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', flex: 1 }}>
                <option value="">All Years</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
              </select>
              <input value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} placeholder="Section (e.g. A)" style={{ padding: '8px 12px', borderRadius: '8px', background: '#252834', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', flex: 1 }} />
            </div>
            {searchResults.length === 0 && <div style={{ color: '#636b7e', textAlign: 'center', padding: '20px', fontSize: '13px' }}>No users found. Try a different search.</div>}
            {searchResults.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#252834', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '16px' }}>
                    {u.profile?.avatarBase64 ? <img src={u.profile.avatarBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                  </div>
                  <div>
                    <div style={{ color: '#e8eaf0', fontSize: '13px', fontWeight: 700 }}>{u.fullName}</div>
                    <div style={{ color: '#636b7e', fontSize: '11px' }}>
                      {u.role} {u.profile?.year ? `· Year ${u.profile.year}` : ''} {u.profile?.section ? `· Sec ${u.profile.section}` : ''} {u.profile?.course ? `· ${u.profile.course}` : ''}
                    </div>
                  </div>
                </div>
                <button onClick={() => startChat(u.id)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #C62828, #e53935)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>💬 Chat</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
