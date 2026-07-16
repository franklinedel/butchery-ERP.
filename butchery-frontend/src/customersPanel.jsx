import { useEffect, useState } from 'react';
import { apiGet, apiPost } from './api';

// Credit accounts list + a printable itemized statement per customer —
// this is what a school or hotel asking "what do we owe, and for what"
// can actually be shown, backed by the real sales and payments tables.
export default function CustomersPanel() {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', customer_type: 'individual', phone: '', credit_limit: 3000 });
  const [formError, setFormError] = useState('');

  const [payment, setPayment] = useState({ branch_id: '', amount: '' });
  const [paymentError, setPaymentError] = useState('');
  const [payingSaving, setPayingSaving] = useState(false);

  const loadCustomers = () => {
    apiGet('/customers').then((data) => {
      setCustomers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
    apiGet('/branches').then((b) => {
      setBranches(b);
      setPayment((p) => ({ ...p, branch_id: String(b.find((br) => br.is_main)?.id || b[0]?.id || '') }));
    });
  }, []);

  const loadStatement = () => {
    if (!selectedId) { setStatement(null); return; }
    apiGet(`/customers/${selectedId}/statement`).then(setStatement).catch(() => setStatement(null));
  };

  useEffect(loadStatement, [selectedId]);

  const handleAddCustomer = async () => {
    setFormError('');
    if (!newCustomer.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    try {
      await apiPost('/customers', {
        name: newCustomer.name.trim(),
        customer_type: newCustomer.customer_type,
        phone: newCustomer.phone.trim() || null,
        credit_limit: Number(newCustomer.credit_limit) || 3000,
      });
      setNewCustomer({ name: '', customer_type: 'individual', phone: '', credit_limit: 3000 });
      setShowForm(false);
      loadCustomers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleRecordPayment = async () => {
    setPaymentError('');
    if (!payment.amount || Number(payment.amount) <= 0) {
      setPaymentError('Enter a payment amount greater than zero.');
      return;
    }
    setPayingSaving(true);
    try {
      await apiPost('/payments', {
        customer_id: selectedId,
        branch_id: Number(payment.branch_id),
        payment_date: new Date().toISOString().slice(0, 10),
        amount: Number(payment.amount),
      });
      setPayment((p) => ({ ...p, amount: '' }));
      loadStatement();
      loadCustomers();
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setPayingSaving(false);
    }
  };

  if (loading) return <p>Loading customers…</p>;

  if (statement) {
    const { customer, ledger } = statement;
    return (
      <div>
        <button className="back-link" onClick={() => setSelectedId(null)}>← Back to all customers</button>

        <div className="card-block statement-block" id="statement-print">
          <div className="statement-header">
            <div>
              <p className="section-title" style={{ marginBottom: 4 }}>{customer.name}</p>
              <p className="hint">{customer.customer_type} {customer.phone && `· ${customer.phone}`}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="metric-label" style={{ marginBottom: 4 }}>Current balance</p>
              <p className="metric-value ledger-num" style={{ color: Number(customer.balance_owed) > 0 ? 'var(--brick)' : 'var(--moss)' }}>
                KES {Number(customer.balance_owed).toLocaleString()}
              </p>
            </div>
          </div>

          <table className="ledger-table" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th className="num">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr><td colSpan="4" className="hint" style={{ padding: 16 }}>No credit transactions yet.</td></tr>
              )}
              {ledger.map((entry, i) => (
                <tr key={i}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>{entry.description}</td>
                  <td className={`num ledger-num ${entry.type === 'payment' ? 'amount-credit' : ''}`}>
                    {entry.amount < 0 ? '−' : ''}KES {Math.abs(entry.amount).toLocaleString()}
                  </td>
                  <td className="num ledger-num">KES {entry.running_balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-block" style={{ marginTop: 16 }}>
          <p className="section-title" style={{ marginBottom: 12 }}>Record a payment</p>
          <div className="entry-controls">
            <label>
              Received at
              <select value={payment.branch_id} onChange={(e) => setPayment((p) => ({ ...p, branch_id: e.target.value }))}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label>
              Amount (KES)
              <input type="number" step="0.01" value={payment.amount}
                onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
            </label>
          </div>
          {paymentError && <p className="inline-error">{paymentError}</p>}
          <button className="save-btn no-print" onClick={handleRecordPayment} disabled={payingSaving}>
            {payingSaving ? 'Saving…' : 'Record payment'}
          </button>
        </div>

        <button className="save-btn no-print" style={{ marginTop: 16 }} onClick={() => window.print()}>
          Print statement
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span />
        <button className="save-btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add customer'}
        </button>
      </div>

      {showForm && (
        <div className="card-block" style={{ marginBottom: 20 }}>
          <div className="entry-controls">
            <label>
              Name
              <input
                type="text"
                placeholder="e.g. St. Mary's School"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))}
              />
            </label>
            <label>
              Type
              <select
                value={newCustomer.customer_type}
                onChange={(e) => setNewCustomer((s) => ({ ...s, customer_type: e.target.value }))}
              >
                <option value="individual">Individual</option>
                <option value="school">School</option>
                <option value="hotel">Hotel</option>
              </select>
            </label>
            <label>
              Phone
              <input
                type="text"
                placeholder="Optional"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))}
              />
            </label>
            <label>
              Credit limit (KES)
              <input
                type="number"
                value={newCustomer.credit_limit}
                onChange={(e) => setNewCustomer((s) => ({ ...s, credit_limit: e.target.value }))}
              />
            </label>
          </div>
          {formError && <p className="inline-error">{formError}</p>}
          <button className="save-btn" onClick={handleAddCustomer}>Save customer</button>
        </div>
      )}

      {customers.length === 0 && <p className="hint">No credit customers on record yet.</p>}
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th className="num">Balance owed</th>
            <th className="num">Credit limit</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="hint" style={{ textTransform: 'capitalize' }}>{c.customer_type}</td>
              <td className={`num ledger-num ${Number(c.balance_owed) > Number(c.credit_limit) ? 'amount-over' : ''}`}>
                KES {Number(c.balance_owed).toLocaleString()}
              </td>
              <td className="num ledger-num">KES {Number(c.credit_limit).toLocaleString()}</td>
              <td>
                <button className="save-btn" onClick={() => setSelectedId(c.id)}>View statement</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}