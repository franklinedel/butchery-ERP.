import { useEffect, useState } from 'react';
import { apiGet, apiPost } from './api';

// Records an actual sale — cash or credit. This is what an attendant
// uses through the day, separate from the closing entry screen
// (which only records the physical count and expenses at night).
export default function SalesEntry() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [todaySales, setTodaySales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    product_id: '', weight_kg: '', price_charged: '',
    payment_type: 'cash', customer_id: '', discount_reason: 'none',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([apiGet('/branches'), apiGet('/products'), apiGet('/customers')])
      .then(([b, p, c]) => {
        setBranches(b);
        setProducts(p);
        setCustomers(c);
        setBranchId(String(b.find((br) => br.is_main)?.id || b[0]?.id || ''));
        if (p[0]) setForm((f) => ({ ...f, product_id: String(p[0].id), price_charged: p[0].price_per_kg }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadTodaySales = () => {
    if (!branchId) return;
    apiGet(`/sales?branch_id=${branchId}&date=${date}`).then(setTodaySales).catch(() => setTodaySales([]));
  };

  useEffect(loadTodaySales, [branchId, date]);

  const handleProductChange = (productId) => {
    const product = products.find((p) => String(p.id) === productId);
    setForm((f) => ({ ...f, product_id: productId, price_charged: product?.price_per_kg || '' }));
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.product_id || !form.weight_kg || form.price_charged === '') {
      setFormError('Product, weight, and price are all required.');
      return;
    }
    if (form.payment_type === 'credit' && !form.customer_id) {
      setFormError('Choose a customer for a credit sale.');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/sales', {
        branch_id: Number(branchId),
        product_id: Number(form.product_id),
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        sale_date: date,
        weight_kg: Number(form.weight_kg),
        price_charged: Number(form.price_charged),
        payment_type: form.payment_type,
        discount_reason: form.discount_reason,
      });
      setForm((f) => ({ ...f, weight_kg: '', customer_id: '', payment_type: 'cash', discount_reason: 'none' }));
      loadTodaySales();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading…</p>;

  const totalToday = todaySales.reduce((sum, s) => sum + Number(s.weight_kg) * Number(s.price_charged), 0);

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

      <div className="card-block" style={{ marginBottom: 20 }}>
        <p className="section-title">Record a sale</p>
        <div className="entry-controls">
          <label>
            Product
            <select value={form.product_id} onChange={(e) => handleProductChange(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            Weight (kg)
            <input type="number" step="0.01" value={form.weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))} />
          </label>
          <label>
            Price charged (per kg)
            <input type="number" step="0.01" value={form.price_charged}
              onChange={(e) => setForm((f) => ({ ...f, price_charged: e.target.value }))} />
          </label>
          <label>
            Payment
            <select value={form.payment_type} onChange={(e) => setForm((f) => ({ ...f, payment_type: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </label>
        </div>

        {form.payment_type === 'credit' && (
          <div className="entry-controls">
            <label>
              Customer
              <select value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Select…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Reason
              <select value={form.discount_reason} onChange={(e) => setForm((f) => ({ ...f, discount_reason: e.target.value }))}>
                <option value="none">Full price</option>
                <option value="regular_customer">Regular customer discount</option>
                <option value="school_hotel">School / hotel rate</option>
                <option value="weekly_promo_day">Weekly promo day</option>
              </select>
            </label>
          </div>
        )}

        {formError && <p className="inline-error">{formError}</p>}
        <button className="save-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Record sale'}
        </button>
      </div>

      <p className="section-title">Sales recorded today</p>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="num">Weight</th>
            <th className="num">Price</th>
            <th>Payment</th>
            <th>Customer</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {todaySales.length === 0 && (
            <tr><td colSpan="6" className="hint" style={{ padding: 16 }}>No sales recorded yet for this branch/date.</td></tr>
          )}
          {todaySales.map((s) => (
            <tr key={s.id}>
              <td>{s.product_name}</td>
              <td className="num ledger-num">{Number(s.weight_kg).toFixed(2)}</td>
              <td className="num ledger-num">{Number(s.price_charged).toFixed(2)}</td>
              <td className="hint" style={{ textTransform: 'capitalize' }}>{s.payment_type}</td>
              <td>{s.customer_name ? `${s.customer_name} (${s.customer_type})` : '—'}</td>
              <td className="num ledger-num">KES {(Number(s.weight_kg) * Number(s.price_charged)).toLocaleString()}</td>
            </tr>
          ))}
          {todaySales.length > 0 && (
            <tr>
              <td colSpan="5"><strong>Total</strong></td>
              <td className="num ledger-num"><strong>KES {totalToday.toLocaleString()}</strong></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}