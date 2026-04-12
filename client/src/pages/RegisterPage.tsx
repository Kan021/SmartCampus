import { useState, FormEvent, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import bbdLogo from '../assets/bbd-logo.png';

type Role = 'student' | 'faculty' | 'admin';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student' as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password strength calculation
  const strength = useMemo(() => {
    const p = form.password;
    if (!p) return { level: '', score: 0 };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    const levels = ['', 'weak', 'weak', 'fair', 'good', 'strong'];
    const labels = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return { level: levels[score], label: labels[score], score };
  }, [form.password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await authApi.register(form);
      if (res.success) {
        // In dev mode the server auto-verifies — skip OTP page
        if (res.data?.isVerified) {
          toast.success('✅ Account created! You can log in now.');
          navigate('/login');
        } else {
          toast.success('Registration successful! Check your email for the verification code.');
          navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        }
      }
    } catch (err: any) {
      if (err.errors?.length) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e: { field: string; message: string }) => {
          errors[e.field] = e.message;
        });
        setFieldErrors(errors);
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };


  const roles: { value: Role; emoji: string; label: string }[] = [
    { value: 'student', emoji: '🎓', label: 'Student' },
    { value: 'faculty', emoji: '👨‍🏫', label: 'Faculty' },
    { value: 'admin', emoji: '🛠️', label: 'Admin' },
  ];

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
          <h1>Create Account</h1>
          <p>Join the Smart Campus ecosystem</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <label className="form-label">I am a</label>
          <div className="role-selector">
            {roles.map((r) => (
              <div className="role-option" key={r.value}>
                <input
                  type="radio"
                  name="role"
                  id={`role-${r.value}`}
                  value={r.value}
                  checked={form.role === r.value}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                />
                <label htmlFor={`role-${r.value}`}>
                  <span className="role-emoji">{r.emoji}</span>
                  <span className="role-name">{r.label}</span>
                </label>
              </div>
            ))}
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="register-name"
                type="text"
                className={`form-input ${fieldErrors.fullName ? 'error' : ''}`}
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                autoFocus
              />
            </div>
            {fieldErrors.fullName && <div className="form-error">⚠ {fieldErrors.fullName}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                id="register-email"
                type="email"
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                placeholder="you@university.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <div className="form-error">⚠ {fieldErrors.email}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                placeholder="Min 8 chars, uppercase, number, symbol"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
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
            {fieldErrors.password && <div className="form-error">⚠ {fieldErrors.password}</div>}

            {form.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div className={`strength-fill ${strength.level}`} />
                </div>
                <span className={`strength-text ${strength.level}`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : null}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
