import { useEffect, useState } from 'react';
import { apiGet, getUser, clearSession } from './api';
import Login from './Login';
import ClosingEntry from './ClosingEntry';
import BreakdownEntry from './BreakdownEntry';
import ReportDashboard from './ReportDashboard';
import NotificationsPanel from './NotificationsPanel';
import './App.css';

export default function App() {
  const [user, setUser] = useState(getUser());
  const [tab, setTab] = useState('branches');
  const [branches, setBranches] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    apiGet('/branches')
      .then((data) => {
        setBranches(data);
        setStatus('ok');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  }, [user]);

  if (!user) {
    return <Login onLoggedIn={setUser} />;
  }

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <div className="page">
      <div className="masthead">
        <h1>Butchery ERP</h1>
        <div className="user-badge">
          <span className={`status ${status}`}>
            {status === 'loading' && 'connecting…'}
            {status === 'ok' && 'connected'}
            {status === 'error' && 'connection failed'}
          </span>
          {user.username} ({user.role}{user.branch_name ? ` · ${user.branch_name}` : ''})
          <button className="logout-link" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'branches' ? 'active' : ''}`} onClick={() => setTab('branches')}>
          Branches
        </button>
        <button className={`tab-btn ${tab === 'closing' ? 'active' : ''}`} onClick={() => setTab('closing')}>
          Closing entry
        </button>
        <button className={`tab-btn ${tab === 'breakdown' ? 'active' : ''}`} onClick={() => setTab('breakdown')}>
          Carcass & breakdown
        </button>
        <button className={`tab-btn ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Reports
        </button>
        <button className={`tab-btn ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>
          Alerts
        </button>
      </div>

      {status === 'error' && (
        <div className="error-box">
          Could not reach the backend at <code>{import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}</code>.
          Make sure the backend server is running (<code>npm start</code> in the
          butchery-backend folder) before reloading this page.
          <br /><br />
          Details: {errorMessage}
        </div>
      )}

      {status === 'ok' && tab === 'branches' && (
        <>
          <p className="subhead">Branches on record</p>
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
        </>
      )}

      {status === 'ok' && tab === 'closing' && (
        <>
          <p className="subhead">End of day closing entry</p>
          <ClosingEntry />
        </>
      )}

      {status === 'ok' && tab === 'breakdown' && (
        <>
          <p className="subhead">Main branch: carcass intake, breakdown, and allocation</p>
          <BreakdownEntry />
        </>
      )}

      {status === 'ok' && tab === 'reports' && (
        <>
          <p className="subhead">Branch performance report</p>
          <ReportDashboard />
        </>
      )}

      {status === 'ok' && tab === 'alerts' && (
        <>
          <p className="subhead">Alerts</p>
          <NotificationsPanel />
        </>
      )}
    </div>
  );
}