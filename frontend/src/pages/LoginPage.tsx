import { useState } from 'react';
import type { LoginRequest } from '../types';

const LoginPage = () => {
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async () => {
    if (!form.email.endsWith('.edu')) {
      setError('Please use a .edu email address.');
      return;
    }
    setError('');
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      console.log('Response:', data);
      // TODO: save token, redirect
    } catch (err) {
      setError('Something went wrong. Is the backend running?');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '2rem' }}>
      <h1>🏠 Roommate Finder</h1>
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <input
        type="email"
        placeholder="your@university.edu"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        style={{ display: 'block', width: '100%', marginBottom: 16, padding: 8 }}
      />

      <button onClick={handleSubmit} style={{ width: '100%', padding: 10 }}>
        {isRegistering ? 'Register' : 'Login'}
      </button>

      <p
        style={{ cursor: 'pointer', color: 'blue', marginTop: 12 }}
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
      </p>
    </div>
  );
};

export default LoginPage;