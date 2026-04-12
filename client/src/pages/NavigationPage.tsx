import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventApi, mapPinApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix Leaflet icons ───────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Icons ────────────────────────────────────────────────────────
const makeIcon = (emoji: string, color: string, size = 36) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;line-height:1;">${emoji}</div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2],
  });

const ICONS: Record<string, L.DivIcon> = {
  academic: makeIcon('🎓','#C62828'), admin: makeIcon('🏛️','#1565C0'),
  library: makeIcon('📚','#6a1b9a'), hostel: makeIcon('🏠','#2e7d32'),
  sports: makeIcon('⚽','#e65100'), canteen: makeIcon('🍽️','#f9a825'),
  lab: makeIcon('🔬','#00838f'), gate: makeIcon('🚪','#37474f'),
  parking: makeIcon('🅿️','#546e7a'), medical: makeIcon('🏥','#d32f2f'),
  event: makeIcon('🎉','#e91e8c'), custom: makeIcon('📍','#C62828'),
  default: makeIcon('📍','#C62828'),
};

const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#2979FF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(41,121,255,0.25),0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const DEST_ICON = makeIcon('🏁', '#d32f2f', 42);

// ─── Campus Data ──────────────────────────────────────────────────
const CAMPUS_CENTER: [number, number] = [26.8879, 81.0566];
const DEFAULT_ZOOM = 17;

interface Landmark { id: string; name: string; category: string; lat: number; lng: number; description: string; }
interface CustomPin { id: string; name: string; description: string; category: string; latitude: number; longitude: number; icon: string; color: string; createdBy: { id: string; fullName: string; role: string }; createdAt: string; }
interface MapEvent { id: string; title: string; venue: string; eventDate: string; category: string; latitude: number; longitude: number; organizerName: string; }
interface RouteInfo { coords: [number, number][]; distanceKm: number; durationMin: number; destName: string; }

const CAMPUS_LANDMARKS: Landmark[] = [
  { id: 'b1', name: 'Block A — CS & IT Department', category: 'academic', lat: 26.8885, lng: 81.0555, description: 'Computer Science & IT. CS labs, seminar hall, faculty offices.' },
  { id: 'b2', name: 'Block B — Engineering', category: 'academic', lat: 26.8882, lng: 81.0572, description: 'Mechanical, Civil, Electrical Engineering. Workshop area.' },
  { id: 'b3', name: 'Block C — Management & BBA', category: 'academic', lat: 26.8878, lng: 81.0580, description: 'School of Management. BBA, MBA, entrepreneurship cell.' },
  { id: 'b4', name: 'Block D — Science & Humanities', category: 'academic', lat: 26.8873, lng: 81.0562, description: 'Physics, Chemistry, Maths, English departments.' },
  { id: 'b5', name: 'Block E — Pharmacy', category: 'academic', lat: 26.8870, lng: 81.0550, description: 'B.Pharm & M.Pharm labs and classrooms.' },
  { id: 'a1', name: 'Main Administrative Building', category: 'admin', lat: 26.8880, lng: 81.0563, description: 'VC office, Registrar, Admissions, Accounts, Exam Cell.' },
  { id: 'a2', name: 'Examination Control Office', category: 'admin', lat: 26.8876, lng: 81.0570, description: 'Exam scheduling, hall tickets, results.' },
  { id: 'l1', name: 'Central Library', category: 'library', lat: 26.8883, lng: 81.0560, description: '3-floor, 50,000+ books, digital section. 8 AM–9 PM.' },
  { id: 'h1', name: 'Saraswati Bhawan — Girls Hostel', category: 'hostel', lat: 26.8892, lng: 81.0545, description: 'Girls hostel, AC rooms, mess, common room.' },
  { id: 'h2', name: 'Kaveri Bhawan — Boys Hostel', category: 'hostel', lat: 26.8895, lng: 81.0560, description: 'Boys hostel Block A. 200 students.' },
  { id: 'h3', name: 'Ganga Bhawan — Boys Hostel', category: 'hostel', lat: 26.8893, lng: 81.0575, description: 'Boys hostel Block B. Newer wing.' },
  { id: 's1', name: 'Main Sports Ground', category: 'sports', lat: 26.8868, lng: 81.0575, description: 'Cricket, football, 200m track.' },
  { id: 's2', name: 'Indoor Sports Complex', category: 'sports', lat: 26.8866, lng: 81.0565, description: 'Badminton, TT, basketball, gym.' },
  { id: 'c1', name: 'Main Canteen', category: 'canteen', lat: 26.8877, lng: 81.0555, description: 'Central food court. Breakfast, lunch, snacks.' },
  { id: 'c2', name: 'Coffee Corners — Block A', category: 'canteen', lat: 26.8884, lng: 81.0550, description: 'Tea/coffee and snacks near CS block.' },
  { id: 'lb1', name: 'Computer Lab Complex', category: 'lab', lat: 26.8886, lng: 81.0558, description: '5 labs, 300+ systems. Programming, DBMS.' },
  { id: 'lb2', name: 'Physics & Chemistry Labs', category: 'lab', lat: 26.8875, lng: 81.0558, description: 'B.Tech/B.Sc practical labs.' },
  { id: 'g1', name: 'Main Gate (Gate 1)', category: 'gate', lat: 26.8862, lng: 81.0566, description: 'Primary entrance from Ayodhya Road.' },
  { id: 'g2', name: 'Back Gate (Gate 2)', category: 'gate', lat: 26.8898, lng: 81.0555, description: 'Secondary entrance near hostels.' },
  { id: 'p1', name: 'Main Parking Area', category: 'parking', lat: 26.8865, lng: 81.0558, description: '2W & 4W parking near Main Gate.' },
  { id: 'p2', name: 'Faculty Parking', category: 'parking', lat: 26.8879, lng: 81.0548, description: 'Reserved faculty parking.' },
  { id: 'm1', name: 'Campus Health Center', category: 'medical', lat: 26.8874, lng: 81.0552, description: '24x7 first-aid, doctor, ambulance.' },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '📍', color: '#C62828' },
  { key: 'academic', label: 'Academic', icon: '🎓', color: '#C62828' },
  { key: 'admin', label: 'Admin', icon: '🏛️', color: '#1565C0' },
  { key: 'library', label: 'Library', icon: '📚', color: '#6a1b9a' },
  { key: 'hostel', label: 'Hostels', icon: '🏠', color: '#2e7d32' },
  { key: 'sports', label: 'Sports', icon: '⚽', color: '#e65100' },
  { key: 'canteen', label: 'Food', icon: '🍽️', color: '#f9a825' },
  { key: 'lab', label: 'Labs', icon: '🔬', color: '#00838f' },
  { key: 'gate', label: 'Gates', icon: '🚪', color: '#37474f' },
  { key: 'parking', label: 'Parking', icon: '🅿️', color: '#546e7a' },
  { key: 'medical', label: 'Medical', icon: '🏥', color: '#d32f2f' },
  { key: 'event', label: 'Events', icon: '🎉', color: '#e91e8c' },
  { key: 'custom', label: 'Custom Pins', icon: '📌', color: '#ff6f00' },
];

const PIN_ICONS = ['📍','🏛️','🎓','📚','🏠','⚽','🍽️','🔬','🚪','🅿️','🏥','🎉','⭐','🔔','📌','🎯','🚩'];

// ─── Hooks ────────────────────────────────────────────────────────
function useUserLocation() {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const w = useRef<number | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) { setErr('Not supported'); return; }
    w.current = navigator.geolocation.watchPosition(
      p => setPos([p.coords.latitude, p.coords.longitude]), e => setErr(e.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
    return () => { if (w.current !== null) navigator.geolocation.clearWatch(w.current); };
  }, []);
  return { pos, err };
}

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, 18, { duration: 1 }); }, [pos, map]);
  return null;
}

// ─── OSRM Route Fetcher (free, no key) ────────────────────────────
async function fetchRoute(from: [number, number], to: [number, number]): Promise<RouteInfo | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    const r = data.routes[0];
    const coords: [number, number][] = r.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    return { coords, distanceKm: +(r.distance / 1000).toFixed(2), durationMin: Math.ceil(r.duration / 60), destName: '' };
  } catch { return null; }
}

// ─── Map Click Handler Component ──────────────────────────────────
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════
export default function NavigationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pos: userPos, err: geoError } = useUserLocation();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [customPins, setCustomPins] = useState<CustomPin[]>([]);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  // Routing state
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Drop-pin mode
  const [dropPinMode, setDropPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinForm, setPinForm] = useState({ name: '', description: '', icon: '📍' });

  const canDropPin = user && (user.role === 'faculty' || user.role === 'admin');

  // Load data
  useEffect(() => {
    eventApi.list({ page: 1, limit: 100 }).then((res: any) => {
      if (res.success) setEvents((res.data.events || []).filter((e: any) => e.latitude != null && e.longitude != null));
    }).catch(() => {});
    loadPins();
  }, []);

  const loadPins = () => {
    mapPinApi.list().then((res: any) => { if (res.success) setCustomPins(res.data); }).catch(() => {});
  };

  // Filters
  const filteredLandmarks = CAMPUS_LANDMARKS.filter(lm => {
    if (category !== 'all' && category !== 'event' && category !== 'custom' && lm.category !== category) return false;
    if (category === 'event' || category === 'custom') return false;
    if (search) { const q = search.toLowerCase(); return lm.name.toLowerCase().includes(q) || lm.description.toLowerCase().includes(q); }
    return true;
  });
  const filteredEvents = events.filter(ev => {
    if (category !== 'all' && category !== 'event') return false;
    if (search) { const q = search.toLowerCase(); return ev.title.toLowerCase().includes(q) || ev.venue.toLowerCase().includes(q); }
    return true;
  });
  const filteredPins = customPins.filter(p => {
    if (category !== 'all' && category !== 'custom') return false;
    if (search) { const q = search.toLowerCase(); return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q); }
    return true;
  });

  const handleFly = useCallback((lat: number, lng: number) => {
    setFlyTarget([lat, lng]);
    setTimeout(() => setFlyTarget(null), 1500);
  }, []);

  // ─── Route To ────────────────────────────────────────────────────
  const navigateTo = useCallback(async (destLat: number, destLng: number, destName: string) => {
    if (!userPos) { toast.error('Enable location services to get directions'); return; }
    setRouteLoading(true);
    const r = await fetchRoute(userPos, [destLat, destLng]);
    setRouteLoading(false);
    if (r) {
      r.destName = destName;
      setRoute(r);
      // Fit map to route bounds
      if (mapRef.current && r.coords.length > 0) {
        const bounds = L.latLngBounds(r.coords.map(c => L.latLng(c[0], c[1])));
        mapRef.current.fitBounds(bounds, { padding: [60, 60] });
      }
    } else {
      toast.error('Could not find a walking route');
    }
  }, [userPos]);

  const clearRoute = () => setRoute(null);

  // ─── Drop Pin Handlers ──────────────────────────────────────────
  const handleMapClick = (lat: number, lng: number) => {
    if (!dropPinMode) return;
    setPendingPin({ lat, lng });
    setPinForm({ name: '', description: '', icon: '📍' });
  };

  const savePin = async () => {
    if (!pendingPin || !pinForm.name.trim()) { toast.error('Pin name is required'); return; }
    const res = await mapPinApi.create({
      name: pinForm.name, description: pinForm.description,
      category: 'custom', latitude: pendingPin.lat, longitude: pendingPin.lng, icon: pinForm.icon,
    });
    if (res.success) { toast.success('📍 Pin dropped!'); loadPins(); setPendingPin(null); setDropPinMode(false); }
    else toast.error(res.message || 'Failed');
  };

  const deletePin = async (id: string) => {
    if (!confirm('Delete this pin?')) return;
    await mapPinApi.delete(id);
    toast.success('Pin removed');
    loadPins();
  };

  if (!user) return null;

  return (
    <div className="dashboard-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      <header className="dashboard-header">
        <div className="brand-sm">
          <img src={bbdLogo} alt="BBD University" style={{ height: '38px', objectFit: 'contain' }} />
          <h2>Campus Navigation</h2>
        </div>
        <div className="user-info">
          <span className={`role-badge ${user.role}`}>
            {user.role === 'student' ? '🎓' : user.role === 'faculty' ? '👨‍🏫' : '🛠️'} {user.role}
          </span>
          {canDropPin && (
            <button
              onClick={() => { setDropPinMode(d => !d); setPendingPin(null); }}
              style={{
                background: dropPinMode ? '#ff6f00' : 'rgba(255,255,255,0.15)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px', padding: '6px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}>
              {dropPinMode ? '✕ Cancel Pin' : '📌 Drop Pin'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowSidebar(s => !s)}>
            {showSidebar ? '◀ Hide' : '▶ Show'}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 64px)' }}>
        {/* ── Sidebar ── */}
        {showSidebar && (
          <div style={{ width: '340px', flexShrink: 0, background: '#fff', borderRight: '2px solid #000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Search */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fb' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.4 }}>🔍</span>
                <input className="form-input" style={{ paddingLeft: '32px', fontSize: '13px' }} placeholder="Search buildings, labs…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Categories */}
            <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: '3px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setCategory(cat.key)} style={{
                  padding: '3px 8px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '10px', whiteSpace: 'nowrap',
                  background: category === cat.key ? cat.color : '#fff', color: category === cat.key ? '#fff' : '#555',
                  border: category === cat.key ? `1px solid ${cat.color}` : '1px solid rgba(0,0,0,0.12)', transition: 'all .15s',
                }}>{cat.icon} {cat.label}</button>
              ))}
            </div>

            {/* Location + Route buttons */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '6px' }}>
              <button onClick={() => { if (userPos) handleFly(userPos[0], userPos[1]); }} disabled={!userPos} style={{
                flex: 1, padding: '7px', borderRadius: '8px', cursor: userPos ? 'pointer' : 'not-allowed',
                background: userPos ? 'rgba(41,121,255,0.08)' : '#f0f2f5', color: userPos ? '#2979FF' : '#999',
                border: `1px solid ${userPos ? 'rgba(41,121,255,0.3)' : 'rgba(0,0,0,0.1)'}`, fontWeight: 700, fontSize: '12px',
              }}>📍 {userPos ? 'My Location' : geoError ? 'Unavailable' : 'Locating…'}</button>
              {route && (
                <button onClick={clearRoute} style={{
                  padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)',
                  fontWeight: 700, fontSize: '12px',
                }}>✕ Clear Route</button>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
              {filteredLandmarks.length === 0 && filteredEvents.length === 0 && filteredPins.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#999' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗺️</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>No locations match</div>
                </div>
              )}

              {/* Custom pins */}
              {filteredPins.map(p => (
                <SidebarItem key={`pin-${p.id}`} icon={p.icon} name={p.name}
                  detail={`📌 by ${p.createdBy.fullName}`} color="#ff6f00"
                  onView={() => handleFly(p.latitude, p.longitude)}
                  onNavigate={userPos ? () => navigateTo(p.latitude, p.longitude, p.name) : undefined}
                  onDelete={(user.role === 'admin' || p.createdBy.id === user.id) ? () => deletePin(p.id) : undefined}
                />
              ))}

              {/* Event pins */}
              {filteredEvents.map(ev => (
                <SidebarItem key={`ev-${ev.id}`} icon="🎉" name={ev.title}
                  detail={`${ev.venue} · ${new Date(ev.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  color="#e91e8c" onView={() => handleFly(ev.latitude, ev.longitude)}
                  onNavigate={userPos ? () => navigateTo(ev.latitude, ev.longitude, ev.title) : undefined}
                />
              ))}

              {/* Landmarks */}
              {filteredLandmarks.map(lm => {
                const cat = CATEGORIES.find(c => c.key === lm.category);
                return (
                  <SidebarItem key={lm.id} icon={cat?.icon || '📍'} name={lm.name}
                    detail={lm.description.substring(0, 70) + (lm.description.length > 70 ? '…' : '')}
                    color={cat?.color || '#C62828'} onView={() => handleFly(lm.lat, lm.lng)}
                    onNavigate={userPos ? () => navigateTo(lm.lat, lm.lng, lm.name) : undefined}
                  />
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fb', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', fontWeight: 600 }}>
              <span>🏗️ {CAMPUS_LANDMARKS.length} bldgs</span>
              <span>📌 {customPins.length} pins</span>
              <span>🎉 {events.length} events</span>
              <span>{userPos ? '📍 Live' : '⏳ GPS'}</span>
            </div>
          </div>
        )}

        {/* ── Map ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Drop-pin banner */}
          {dropPinMode && (
            <div style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
              background: '#ff6f00', color: '#fff', padding: '8px 24px', borderRadius: '20px',
              fontWeight: 800, fontSize: '13px', boxShadow: '0 4px 16px rgba(255,111,0,0.4)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              📌 Tap anywhere on the map to drop a pin
            </div>
          )}

          {/* Route info panel */}
          {route && (
            <div style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 1100,
              background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
              border: '2px solid #000', borderRadius: '14px', padding: '14px 18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: '300px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Walking Directions</div>
                  <div style={{ fontWeight: 900, fontSize: '15px', color: '#1a1a2e', marginTop: '2px' }}>🏁 {route.destName}</div>
                </div>
                <button onClick={clearRoute} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#C62828' }}>{route.distanceKm}</div>
                  <div style={{ fontSize: '10px', color: '#888', fontWeight: 700 }}>KM</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#2979FF' }}>{route.durationMin}</div>
                  <div style={{ fontSize: '10px', color: '#888', fontWeight: 700 }}>MIN WALK</div>
                </div>
              </div>
            </div>
          )}

          {/* Pending pin form */}
          {pendingPin && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
              background: '#fff', border: '2px solid #000', borderRadius: '14px',
              padding: '16px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '320px',
            }}>
              <div style={{ fontWeight: 900, fontSize: '14px', marginBottom: '10px', color: '#1a1a2e' }}>📌 New Pin at ({pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)})</div>
              <input className="form-input" style={{ fontSize: '13px', marginBottom: '8px' }} placeholder="Pin name *" value={pinForm.name} onChange={e => setPinForm(f => ({ ...f, name: e.target.value }))} />
              <input className="form-input" style={{ fontSize: '13px', marginBottom: '8px' }} placeholder="Description (optional)" value={pinForm.description} onChange={e => setPinForm(f => ({ ...f, description: e.target.value }))} />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {PIN_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setPinForm(f => ({ ...f, icon: ic }))} style={{
                    width: '32px', height: '32px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer',
                    background: pinForm.icon === ic ? '#ff6f00' : '#f0f2f5',
                    border: pinForm.icon === ic ? '2px solid #ff6f00' : '1px solid rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{ic}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={savePin} style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#ff6f00', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>📌 Save Pin</button>
                <button onClick={() => setPendingPin(null)} style={{ padding: '9px 14px', borderRadius: '8px', background: '#f0f2f5', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </div>
            </div>
          )}

          <MapContainer center={CAMPUS_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%', cursor: dropPinMode ? 'crosshair' : '' }} ref={mapRef as any} zoomControl={false}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {flyTarget && <FlyTo pos={flyTarget} />}
            {dropPinMode && <MapClickHandler onMapClick={handleMapClick} />}

            {/* Campus boundary */}
            <Circle center={CAMPUS_CENTER} radius={350} pathOptions={{ color: '#C62828', fillColor: '#C62828', fillOpacity: 0.03, weight: 2, dashArray: '8 4' }} />

            {/* Walking route polyline */}
            {route && (
              <>
                {/* Shadow line */}
                <Polyline positions={route.coords} pathOptions={{ color: '#000', weight: 8, opacity: 0.15 }} />
                {/* Main route line */}
                <Polyline positions={route.coords} pathOptions={{ color: '#2979FF', weight: 5, opacity: 0.9 }} />
                {/* Destination flag */}
                <Marker position={route.coords[route.coords.length - 1]} icon={DEST_ICON}>
                  <Popup><strong>🏁 {route.destName}</strong><br/>{route.distanceKm} km · {route.durationMin} min walk</Popup>
                </Marker>
              </>
            )}

            {/* Landmark markers */}
            {filteredLandmarks.map(lm => (
              <Marker key={lm.id} position={[lm.lat, lm.lng]} icon={ICONS[lm.category] || ICONS.default}>
                <Popup maxWidth={280} minWidth={200}>
                  <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: '#1a1a2e', borderBottom: '2px solid #C62828', paddingBottom: '5px', marginBottom: '6px' }}>
                      {CATEGORIES.find(c => c.key === lm.category)?.icon} {lm.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.5, marginBottom: '8px' }}>{lm.description}</div>
                    {userPos && <button onClick={() => navigateTo(lm.lat, lm.lng, lm.name)} style={{ width: '100%', padding: '7px', borderRadius: '8px', background: '#2979FF', color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>🧭 Get Directions</button>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Event markers */}
            {filteredEvents.map(ev => (
              <Marker key={`ev-${ev.id}`} position={[ev.latitude, ev.longitude]} icon={ICONS.event}>
                <Popup maxWidth={260}>
                  <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <div style={{ fontWeight: 900, fontSize: '14px', borderBottom: '2px solid #e91e8c', paddingBottom: '5px', marginBottom: '6px' }}>🎉 {ev.title}</div>
                    <div style={{ fontSize: '12px', color: '#555' }}>📍 {ev.venue}</div>
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>📅 {new Date(ev.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    {userPos && <button onClick={() => navigateTo(ev.latitude, ev.longitude, ev.title)} style={{ width: '100%', padding: '7px', borderRadius: '8px', background: '#2979FF', color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>🧭 Get Directions</button>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Custom pin markers */}
            {filteredPins.map(p => (
              <Marker key={`pin-${p.id}`} position={[p.latitude, p.longitude]} icon={makeIcon(p.icon, p.color || '#ff6f00')}>
                <Popup maxWidth={260}>
                  <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <div style={{ fontWeight: 900, fontSize: '14px', borderBottom: '2px solid #ff6f00', paddingBottom: '5px', marginBottom: '6px' }}>{p.icon} {p.name}</div>
                    {p.description && <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>{p.description}</div>}
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>📌 by {p.createdBy.fullName}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {userPos && <button onClick={() => navigateTo(p.latitude, p.longitude, p.name)} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: '#2979FF', color: '#fff', border: 'none', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>🧭 Directions</button>}
                      {(user.role === 'admin' || p.createdBy.id === user.id) && (
                        <button onClick={() => deletePin(p.id)} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Pending pin preview */}
            {pendingPin && (
              <Marker position={[pendingPin.lat, pendingPin.lng]} icon={makeIcon(pinForm.icon || '📍', '#ff6f00', 42)}>
                <Popup><strong>📌 New pin location</strong><br/>Fill the form below to save</Popup>
              </Marker>
            )}

            {/* User live position */}
            {userPos && (
              <>
                <Circle center={userPos} radius={25} pathOptions={{ color: '#2979FF', fillColor: '#2979FF', fillOpacity: 0.08, weight: 1 }} />
                <Marker position={userPos} icon={USER_ICON}>
                  <Popup><div style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif' }}><strong style={{ color: '#2979FF' }}>📍 You</strong></div></Popup>
                </Marker>
              </>
            )}
          </MapContainer>

          {/* Route loading spinner */}
          {routeLoading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1200, background: 'rgba(255,255,255,0.95)', borderRadius: '14px', padding: '20px 30px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🧭</div>
              <div style={{ fontWeight: 800, color: '#1a1a2e' }}>Finding route…</div>
            </div>
          )}

          {/* Zoom controls */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <ZoomBtn label="+" onClick={() => mapRef.current?.zoomIn()} />
            <ZoomBtn label="−" onClick={() => mapRef.current?.zoomOut()} />
            <div style={{ height: '4px' }} />
            <ZoomBtn label="⌂" onClick={() => mapRef.current?.flyTo(CAMPUS_CENTER, DEFAULT_ZOOM, { duration: 0.8 })} />
          </div>

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000,
            background: 'rgba(255,255,255,0.95)', border: '2px solid #000', borderRadius: '12px',
            padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxWidth: '170px',
          }}>
            <div style={{ fontWeight: 900, fontSize: '11px', color: '#1a1a2e', marginBottom: '6px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px' }}>🗺️ Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#555' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }}>{cat.icon}</div>
                  <span>{cat.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#2979FF', fontWeight: 700, marginTop: '3px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2979FF', flexShrink: 0 }} />
                <span>Your Location</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Item ─────────────────────────────────────────────────
function SidebarItem({ icon, name, detail, color, onView, onNavigate, onDelete }: {
  icon: string; name: string; detail: string; color: string;
  onView: () => void; onNavigate?: () => void; onDelete?: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', padding: '8px 10px', borderRadius: '10px', marginBottom: '3px', border: '1px solid rgba(0,0,0,0.05)', transition: 'background .15s', cursor: 'pointer' }}
      onMouseOver={e => (e.currentTarget.style.background = `${color}08`)}
      onMouseOut={e => (e.currentTarget.style.background = '')} >
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }} onClick={onView}>
        <div style={{ fontWeight: 800, fontSize: '12px', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: '10px', color: '#888', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{detail}</div>
      </div>
      <div style={{ display: 'flex', gap: '3px', alignSelf: 'center', flexShrink: 0 }}>
        {onNavigate && <button onClick={e => { e.stopPropagation(); onNavigate(); }} title="Get Directions" style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(41,121,255,0.1)', border: '1px solid rgba(41,121,255,0.2)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🧭</button>}
        {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete Pin" style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>}
        <div onClick={onView} style={{ color, fontSize: '12px', fontWeight: 900, alignSelf: 'center', cursor: 'pointer', marginLeft: '2px' }}>→</div>
      </div>
    </div>
  );
}

function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '36px', height: '36px', borderRadius: '8px', border: '2px solid #000', background: '#fff',
      fontSize: '18px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#1a1a2e', transition: 'background .15s',
    }}
      onMouseOver={e => (e.currentTarget.style.background = '#f0f2f5')}
      onMouseOut={e => (e.currentTarget.style.background = '#fff')}
    >{label}</button>
  );
}
