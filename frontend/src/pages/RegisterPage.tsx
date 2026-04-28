import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveAuth } from '../auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setStatus({ type: 'error', msg: 'Please enter your full name.' });
      return;
    }
    if (!form.email.trim()) {
      setStatus({ type: 'error', msg: 'Please enter your university email.' });
      return;
    }
    if (!form.email.endsWith('.edu')) {
      setStatus({ type: 'error', msg: 'You must use a .edu university email to register.' });
      return;
    }
    if (form.password.length < 8) {
      setStatus({ type: 'error', msg: 'Password must be at least 8 characters long.' });
      return;
    }
    if (form.password !== form.confirm) {
      setStatus({ type: 'error', msg: 'Passwords do not match. Please re-enter them.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json() as { message: string; token: string; user: { id: string; name: string; email: string } };
      if (res.ok) {
        saveAuth(data.token, data.user);
        setStatus({ type: 'success', msg: `Account created! Welcome, ${data.user.name.split(' ')[0]}!` });
        setTimeout(() => navigate('/browse'), 1200);
      } else if (res.status === 409) {
        setStatus({ type: 'error', msg: 'An account with this email already exists. Try logging in instead.' });
      } else {
        setStatus({ type: 'error', msg: data.message ?? 'Registration failed. Please try again.' });
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
        <h1>Create account</h1>
        <p className="subtitle">Join RoomFind with your university email</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Jane Smith" value={form.name} onChange={set('name')} autoComplete="name" />
          </div>
          <div className="form-group">
            <label>University Email (.edu)</label>
            <input type="email" placeholder="you@university.edu" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Password <span style={{ color: '#a0aec0', fontWeight: 400 }}>(min. 8 characters)</span></label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        {status && (
          <div className={`status-msg ${status.type}`}>{status.msg}</div>
        )}
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
