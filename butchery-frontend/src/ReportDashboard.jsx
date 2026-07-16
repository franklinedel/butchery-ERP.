import { useEffect, useState } from 'react';
import { apiGet } from './api';

// The payoff screen — pulls from /api/reports/branch/:id, which
// itself only reads from the already-tested database views.
// Nothing here recalculates profit or variance; it only displays it.
export default function ReportDashboard() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/branches').then((b) => {
      setBranches(b);
      setBranchId(String(b.find((br) => br.is_main)?.id || b[0]?.id || ''));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!branchId) return;
    apiGet(`/reports/branch/${branchId}?date=${date}`).then(setReport).catch(() => setReport(null));
    apiGet('/reports/comparison').then(setComparison).catch(() => setComparison([]));
  }, [branchId, date]);

  if (loading) return <p>Loading…</p>;

  const profit = report?.profit;
  const variance = report?.stock_variance || [];
  const targets = report?.targets || [];

  return (
    <div>
      <div className="entry-controls">
        <label>
          Branch
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {!profit && (
        <p className="hint" style={{ fontSize: 13, margin: '16px 0' }}>
          No sales or expenses recorded for this branch on this date.
        </p>
      )}

      {profit && (
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value ledger-num">KES {Number(profit.revenue).toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Discounts given</div>
            <div className="metric-value ledger-num">KES {Number(profit.discount_given).toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Expenses</div>
            <div className="metric-value ledger-num">KES {Number(profit.expenses).toLocaleString()}</div>
          </div>
          <div className="metric-card highlight">
            <div className="metric-label">Gross profit</div>
            <div className="metric-value ledger-num">KES {Number(profit.gross_profit).toLocaleString()}</div>
          </div>
        </div>
      )}

      {targets.length > 0 && (
        <div className="card-block" style={{ marginTop: 20 }}>
          <p className="section-title">Target progress</p>
          {targets.map((t) => {
            const pct = Math.min(Number(t.pct_of_target), 100);
            const over = Number(t.pct_of_target) >= 100;
            return (
              <div key={t.profit_target_id} style={{ marginBottom: 12 }}>
                <div className="progress-bar">
                  <div className={`progress-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="hint" style={{ marginTop: 4 }}>
                  {t.period_type} — KES {Number(t.actual_profit).toLocaleString()} of {Number(t.target_amount).toLocaleString()} ({Number(t.pct_of_target).toFixed(1)}%)
                </p>
              </div>
            );
          })}
        </div>
      )}

      {variance.length > 0 && (
        <div className="card-block" style={{ marginTop: 20 }}>
          <p className="section-title">Stock variance — where the numbers don't add up</p>
          <table className="ledger-table" style={{ border: 'none' }}>
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Opening</th>
                <th className="num">Received</th>
                <th className="num">Sold</th>
                <th className="num">Closing</th>
                <th className="num">Variance</th>
              </tr>
            </thead>
            <tbody>
              {variance.map((v) => {
                const pct = Number(v.variance_pct);
                const flagged = Math.abs(pct) > 5;
                return (
                  <tr key={v.daily_stock_id}>
                    <td>{v.product_name}</td>
                    <td className="num ledger-num">{Number(v.opening_kg).toFixed(2)}</td>
                    <td className="num ledger-num">{Number(v.received_kg).toFixed(2)}</td>
                    <td className="num ledger-num">{Number(v.sold_kg).toFixed(2)}</td>
                    <td className="num ledger-num">{Number(v.closing_kg).toFixed(2)}</td>
                    <td className="num ledger-num">
                      {Number(v.variance_kg).toFixed(2)}kg
                      {flagged && <span className="flag-warning" style={{ marginLeft: 6 }}>{pct.toFixed(1)}%</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {comparison.length > 0 && (
        <div className="card-block" style={{ marginTop: 20 }}>
          <p className="section-title">Branch comparison — most recent target period</p>
          <table className="ledger-table" style={{ border: 'none' }}>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Period</th>
                <th className="num">Actual profit</th>
                <th className="num">Target</th>
                <th className="num">% of target</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c, i) => (
                <tr key={i}>
                  <td>{c.branch_name}</td>
                  <td>{c.period_type}</td>
                  <td className="num ledger-num">{Number(c.actual_profit).toLocaleString()}</td>
                  <td className="num ledger-num">{Number(c.target_amount).toLocaleString()}</td>
                  <td className="num ledger-num">{Number(c.pct_of_target).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}