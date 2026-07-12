import { useEffect, useState } from 'react';
import { apiGet } from './api';
import './App.css';

// This is the FIRST screen on purpose — its only job is to prove
// the frontend can reach the backend, the same way /api/branches
// was the first thing tested on the backend itself.
export default function App() {
  const [branches, setBranches] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    apiGet('/branches')
      .then((data) => {
        setBranches(data);
        setStatus('ok');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  }, []);

  return (
    <div className="page">
      <div className="masthead">
        <h1>Butchery ERP</h1>
        <span className={`status ${status}`}>
          {status === 'loading' && 'connecting…'}
          {status === 'ok' && 'connected'}
          {status === 'error' && 'connection failed'}
        </span>
      </div>
      <p className="subhead">Branches on record</p>

      {status === 'loading' && <p>Reaching the backend…</p>}

      {status === 'error' && (
        <div className="error-box">
          Could not reach the backend at <code>{import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}</code>.
          Make sure the backend server is running (<code>npm start</code> in the
          butchery-backend folder) before reloading this page.
          <br /><br />
          Details: {errorMessage}
        </div>
      )}

      {status === 'ok' && (
        <div className="branch-grid">
          {branches.map((b) => (
            <div className="branch-card" key={b.id}>
              <div>
                <div className="branch-name">{b.name}</div>
                {b.is_main && <span className="branch-tag">Main branch</span>}
              </div>
              <div className="branch-id">#{String(b.id).padStart(3, '0')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
