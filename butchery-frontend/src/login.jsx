import { useState } from 'react';
import { ChefHat } from 'lucide-react';
import { login } from './api';

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-panel">
          <div className="brand-mark"><ChefHat size={20} /></div>
          <div>
            <h2>Every kilo, accounted for.</h2>
            <p>Track what comes in from the slaughterhouse, what's sold, what's given on
              credit, and where the difference goes — across every branch.</p>
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <h1 className="login-title">Sign in</h1>
          <p className="login-subtitle">Butchery ERP</p>

          <label className="login-field">
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </label>
          <label className="login-field">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="inline-error">{error}</p>}

          <button className="save-btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}