import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ClipboardEvent, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const strength = useMemo(() => {
    const p = newPassword;
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
  }, [newPassword]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (data.length === 6) {
      setOtp(data.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the complete 6-digit code'); return; }

    setError('');
    setLoading(true);

    try {
      const res = await authApi.resetPassword({ email, code, newPassword });
      if (res.success) {
        toast.success('Password reset successful!');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="auth-layout">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="auth-card">
          <div className="card-glow" />
          <div className="brand">
            <div className="brand-icon">⚠️</div>
            <h1>Missing Email</h1>
            <p>Please start from the forgot password page.</p>
          </div>
          <Link to="/forgot-password" className="btn btn-primary">Go to Forgot Password</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-card">
        <div className="card-glow" />

        <div className="brand">
          <div className="brand-icon">🔐</div>
          <h1>Reset Password</h1>
          <p>
            Enter the code sent to<br />
            <strong style={{ color: 'var(--color-accent-pink)' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>Reset Code</label>
          <div className="otp-container" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`otp-input ${digit ? 'filled' : ''}`}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                aria-label={`Reset code digit ${index + 1}`}
              />
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Min 8 chars, uppercase, number, symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

            {newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div className={`strength-fill ${strength.level}`} />
                </div>
                <span className={`strength-text ${strength.level}`}>{strength.label}</span>
              </div>
            )}
          </div>

          <button
            id="reset-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || otp.join('').length !== 6 || !newPassword}
          >
            {loading ? <div className="spinner" /> : null}
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
