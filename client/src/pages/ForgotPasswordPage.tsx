import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Reset code sent!');
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSent(true);
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
          <div className="brand-icon">🔑</div>
          <h1>Forgot Password</h1>
          <p>We'll send a reset code to your email</p>
        </div>

        {sent ? (
          <div className="alert alert-success">
            <span>✅</span> If an account exists with that email, a reset code has been sent.
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={sent}
              />
            </div>
          </div>

          <button
            id="forgot-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || sent}
          >
            {loading ? <div className="spinner" /> : null}
            {loading ? 'Sending...' : sent ? 'Code Sent ✓' : 'Send Reset Code'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
