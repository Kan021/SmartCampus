import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start cooldown timer on mount
  useEffect(() => {
    setResendCooldown(60);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData.length === 6) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authApi.verifyOtp({ email, code, type: 'email_verify' });
      if (res.success) {
        toast.success('Email verified successfully!');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await authApi.resendOtp({ email, type: 'email_verify' });
      toast.success('New code sent!');
      setResendCooldown(60);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
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
            <p>No email address provided for verification.</p>
          </div>
          <Link to="/register" className="btn btn-primary">Go to Register</Link>
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
          <div className="brand-icon">✉️</div>
          <h1>Verify Email</h1>
          <p>
            Enter the 6-digit code sent to<br />
            <strong style={{ color: 'var(--color-accent-primary)' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <button
            id="verify-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? <div className="spinner" /> : null}
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="divider">
          <span>Didn't receive code?</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            className="btn-link"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{ opacity: resendCooldown > 0 ? 0.5 : 1 }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </div>

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
