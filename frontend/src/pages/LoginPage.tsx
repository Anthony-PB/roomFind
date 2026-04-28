import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveAuth } from '../auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus({ type: 'error', msg: 'Please enter your email address.' });
      return;
    }
    if (!password) {
      setStatus({ type: 'error', msg: 'Please enter your password.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { message: string; token: string; user: { id: string; name: string; email: string } };
      if (res.ok) {
        saveAuth(data.token, data.user);
        setStatus({ type: 'success', msg: `Welcome back, ${data.user.name.split(' ')[0]}!` });
        setTimeout(() => navigate('/browse'), 1000);
      } else if (res.status === 401) {
        setStatus({ type: 'error', msg: 'Incorrect email or password. Please try again.' });
      } else {
        setStatus({ type: 'error', msg: data.message ?? 'Login failed. Please try again.' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Cannot connect to server. Make sure the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to find your perfect roommate</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>University Email</label>
            <input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        {status && (
          <div className={`status-msg ${status.type}`}>{status.msg}</div>
        )}
        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
