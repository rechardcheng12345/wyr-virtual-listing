import { useState } from 'react';
import axios from 'axios';

export default function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { username, password });
      onLoggedIn(data.user);
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: '#f5f6fa',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <img src="/logo.jpeg" alt="WYR" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }} />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1a202c' }}>WYR Virtual Listing</h1>
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>
          Sign in to continue
        </p>

        {error && (
          <div
            style={{
              color: '#ef4444',
              fontSize: '0.85rem',
              background: '#fef2f2',
              padding: '8px 12px',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=""
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=""
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
