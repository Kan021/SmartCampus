import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(form);
      if (res.success && res.data) {
        login(res.data.accessToken, res.data.user);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(msg);

      // If email not verified, redirect to verify page
      if (err.message?.includes('not verified')) {
        setTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(form.email)}`), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-card">
        <div className="card-glow" />

        <div className="brand">
          <div className="brand-icon" style={{ background: 'transparent', padding: 0, borderRadius: 0 }}>
            <img src={bbdLogo} alt="BBD University" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
          </div>
          <h1>Smart Campus</h1>
          <p>Sign in to your campus account</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

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
