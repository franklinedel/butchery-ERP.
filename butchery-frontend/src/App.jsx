import { useEffect, useState } from 'react';
import { Store, ClipboardCheck, Split, BarChart3, Bell, ChefHat, Users, Receipt } from 'lucide-react';
import { apiGet, getUser, clearSession } from './api';
import Login from './Login';
import ClosingEntry from './ClosingEntry';
import BreakdownEntry from './BreakdownEntry';
import ReportDashboard from './ReportDashboard';
import NotificationsPanel from './NotificationsPanel';
import CustomersPanel from './CustomersPanel';
import SalesEntry from './SalesEntry';
import './App.css';

const TABS = [
  { id: 'branches', label: 'Branches', icon: Store },
  { id: 'sales', label: 'Sales', icon: Receipt },
  { id: 'closing', label: 'Closing entry', icon: ClipboardCheck },
  { id: 'breakdown', label: 'Carcass & breakdown', icon: Split },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'customers', label: 'Customers', icon: Users },
];

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
        <div className="brand">
          <div className="brand-mark"><ChefHat size={20} /></div>
          <div>
            <h1>Butchery ERP</h1>
            <p className="tagline">Yield, sales &amp; loss tracking</p>
          </div>
        </div>
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
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={15} />
            {label}
          </button>
        ))}
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

      {status === 'ok' && tab === 'sales' && (
        <>
          <p className="subhead">Record a sale</p>
          <SalesEntry />
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

      {status === 'ok' && tab === 'customers' && (
        <>
          <p className="subhead">Credit accounts</p>
          <CustomersPanel />
        </>
      )}
    </div>
  );
}