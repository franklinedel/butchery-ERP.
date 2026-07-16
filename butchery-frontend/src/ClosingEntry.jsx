import { useEffect, useState } from 'react';
import { apiGet, apiPost } from './api';

// Matches the original wireframe: an attendant picks a branch and
// date, sees opening/received stock (filled automatically by the
// database triggers), types in the closing weight, and can also
// log any expenses from that day — all in one screen.
export default function ClosingEntry() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockByProduct, setStockByProduct] = useState({});
  const [closingInputs, setClosingInputs] = useState({});
  const [rowStatus, setRowStatus] = useState({});
  const [loading, setLoading] = useState(true);

  // Expenses state
  const [expenses, setExpenses] = useState([]); // saved expenses for this branch/date
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [expenseStatus, setExpenseStatus] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/branches'), apiGet('/products')])
      .then(([b, p]) => {
        setBranches(b);
        setProducts(p);
        setBranchId(String(b.find((br) => br.is_main)?.id || b[0]?.id || ''));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!branchId) return;
    apiGet(`/daily-stock?date=${date}&branch_id=${branchId}`)
      .then((rows) => {
        const map = {};
        rows.forEach((r) => { map[r.product_id] = r; });
        setStockByProduct(map);
        setClosingInputs({});
        setRowStatus({});
      })
      .catch(() => setStockByProduct({}));

    apiGet(`/expenses?branch_id=${branchId}&date=${date}`)
      .then(setExpenses)
      .catch(() => setExpenses([]));
  }, [branchId, date]);

  const handleSave = async (productId) => {
    const closing_kg = closingInputs[productId];
    if (closing_kg === undefined || closing_kg === '') return;

    setRowStatus((s) => ({ ...s, [productId]: 'saving' }));
    try {
      const saved = await apiPost('/daily-stock', {
        branch_id: Number(branchId),
        product_id: productId,
        stock_date: date,
        closing_kg: Number(closing_kg),
      });
      setStockByProduct((s) => ({ ...s, [productId]: saved }));
      setRowStatus((s) => ({ ...s, [productId]: 'saved' }));
    } catch (err) {
      setRowStatus((s) => ({ ...s, [productId]: 'error' }));
    }
  };

  const addExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    setExpenseStatus('saving');
    try {
      const saved = await apiPost('/expenses', {
        branch_id: Number(branchId),
        expense_date: date,
        description: newExpense.description,
        amount: Number(newExpense.amount),
      });
      setExpenses((list) => [saved, ...list]);
      setNewExpense({ description: '', amount: '' });
      setExpenseStatus('');
    } catch (err) {
      setExpenseStatus('error');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) return <p>Loading branches and products…</p>;

  return (
    <div>
      <div className="entry-controls">
        <label>
          Branch
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <table className="ledger-table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="num">Opening kg</th>
            <th className="num">Received kg</th>
            <th className="num">Closing kg</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const row = stockByProduct[p.id];
            const status = rowStatus[p.id];
            return (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="num ledger-num">{row ? Number(row.opening_kg).toFixed(2) : '—'}</td>
                <td className="num ledger-num">{row ? Number(row.received_kg).toFixed(2) : '—'}</td>
                <td className="num">
                  <input
                    type="number"
                    step="0.01"
                    className="closing-input ledger-num"
                    placeholder={row ? Number(row.closing_kg).toFixed(2) : '0.00'}
                    value={closingInputs[p.id] ?? ''}
                    onChange={(e) =>
                      setClosingInputs((s) => ({ ...s, [p.id]: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <button
                    className="save-btn"
                    onClick={() => handleSave(p.id)}
                    disabled={status === 'saving'}
                  >
                    {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : status === 'error' ? 'Retry' : 'Save'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="card-block" style={{ marginTop: 20 }}>
        <p className="section-title">Expenses today</p>

        {expenses.length > 0 && (
          <table className="ledger-table" style={{ border: 'none', marginBottom: 14 }}>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.description}</td>
                  <td className="num ledger-num">KES {Number(e.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td className="num ledger-num"><strong>KES {totalExpenses.toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="entry-controls">
          <label style={{ flex: 2 }}>
            Description
            <input
              type="text"
              placeholder="e.g. Transport from main branch"
              value={newExpense.description}
              onChange={(e) => setNewExpense((s) => ({ ...s, description: e.target.value }))}
            />
          </label>
          <label>
            Amount (KES)
            <input
              type="number"
              step="0.01"
              value={newExpense.amount}
              onChange={(e) => setNewExpense((s) => ({ ...s, amount: e.target.value }))}
            />
          </label>
        </div>
        {expenseStatus === 'error' && <p className="inline-error">Could not save that expense — try again.</p>}
        <button className="save-btn" onClick={addExpense} disabled={expenseStatus === 'saving'}>
          {expenseStatus === 'saving' ? 'Saving…' : '+ Add expense'}
        </button>
      </div>
    </div>
  );
}