import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

// Demo accounts matched to seed data in mockDb.ts
const DEMO_ACCOUNTS = [
  { label: '🎓 Student',  email: '22cse001@bbdu.ac.in',   password: 'Student@123', color: '#6366f1', name: 'Rahul Verma' },
  { label: '👨‍🏫 Faculty', email: 'dr.sharma@bbdu.ac.in',  password: 'Faculty@123', color: '#10b981', name: 'Dr. Priya Sharma' },
  { label: '🛡️ Admin',    email: 'admin@bbdu.ac.in',       password: 'Admin@123',   color: '#f59e0b', name: 'Dr. Rajesh Kumar' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form);
      if (res.success && res.data) {
        login(res.data.accessToken, res.data.user);
        toast.success(`Welcome back, ${res.data.user.fullName}! 🎓`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setDemoLoading(account.label);
    setError('');
    try {
      const res = await authApi.login({ email: account.email, password: account.password });
      if (res.success && res.data) {
        login(res.data.accessToken, res.data.user);
        toast.success(`Welcome, ${res.data.user.fullName}! Demo access active.`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      // Edge case: DB not seeded yet — seed and retry
      try {
        const { initDb } = await import('../services/mockDb');
        await initDb();
        const res = await authApi.login({ email: account.email, password: account.password });
        if (res.success && res.data) {
          login(res.data.accessToken, res.data.user);
          toast.success(`Welcome, ${res.data.user.fullName}!`);
          navigate('/dashboard');
        }
      } catch {
        setError('Demo login failed. Please refresh the page and try again.');
      }
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="auth-layout">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="card-glow" />

        {/* Brand */}
        <div className="brand">
          <div className="brand-icon" style={{ background: 'transparent', padding: 0, borderRadius: 0 }}>
            <img src={bbdLogo} alt="BBD University" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
          </div>
          <h1>Smart Campus</h1>
          <p>Sign in to your campus account</p>
        </div>

        {/* ── Quick Demo Access ─────────────────────────────────── */}
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '14px',
          padding: '16px 16px 12px',
          marginBottom: '20px',
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#a5b4fc',
            marginBottom: '10px',
            textAlign: 'center',
          }}>
            ⚡ Quick Demo Access — No Login Required
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isThisLoading = demoLoading === acc.label;
              return (
                <button
                  key={acc.label}
                  id={`demo-${acc.name.split(' ')[0].toLowerCase()}`}
                  type="button"
                  onClick={() => handleDemoAccess(acc)}
                  disabled={!!demoLoading}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: `1px solid ${acc.color}44`,
                    background: isThisLoading ? `${acc.color}30` : `${acc.color}14`,
                    color: acc.color,
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: demoLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: (demoLoading && !isThisLoading) ? 0.45 : 1,
                    transition: 'all 0.18s ease',
                    transform: isThisLoading ? 'scale(0.97)' : 'scale(1)',
                  }}
                >
                  {isThisLoading
                    ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: '2px auto' }} />
                    : <span style={{ fontSize: '18px', lineHeight: 1 }}>{acc.label.split(' ')[0]}</span>
                  }
                  <span style={{ fontSize: '11px' }}>
                    {isThisLoading ? 'Loading...' : acc.label.split(' ').slice(1).join(' ')}
                  </span>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', marginBottom: 0, lineHeight: 1.4 }}>
            🔒 All data stored locally in your browser • No server needed
          </p>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or sign in with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@university.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <Link to="/forgot-password" className="btn-link" style={{ fontSize: '12px' }}>
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : null}
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}
