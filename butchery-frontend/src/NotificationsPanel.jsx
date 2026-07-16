import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from './api';

// Alerts list — reads straight from the notifications table.
// The alerts themselves are generated in the database (007/008),
// this screen only displays them and lets you mark them read.
export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [showRead, setShowRead] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const query = showRead ? '' : '?is_read=false';
    apiGet(`/notifications${query}`)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showRead]);

 const markRead = async (id) => {
    await apiPatch(`/notifications/${id}/read`);
    setNotifications((list) => list.filter((n) => n.id !== id));
  };
  if (loading) return <p>Loading alerts…</p>;

  return (
    <div>
      <div className="entry-controls" style={{ marginBottom: 16 }}>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={showRead} onChange={(e) => setShowRead(e.target.checked)} />
          Show already-read alerts
        </label>
      </div>

      {notifications.length === 0 && (
        <p className="hint" style={{ fontSize: 13 }}>
          {showRead ? 'No alerts at all.' : 'No unread alerts right now.'}
        </p>
      )}

      <div className="alert-list">
        {notifications.map((n) => (
          <div key={n.id} className={`alert-row severity-${n.severity}`}>
            <div>
              <div className="alert-message">{n.message}</div>
              <div className="hint">
                {n.branch_name && `${n.branch_name} · `}
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
            {!n.is_read && (
              <button className="save-btn" onClick={() => markRead(n.id)}>Mark read</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}