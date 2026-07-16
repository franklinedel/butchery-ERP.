import { useEffect, useState } from 'react';
import { apiGet, apiPost } from './api';

// Matches the main branch morning wireframe: three steps in one
// screen — log the carcass, break it down into products (with a
// live yield check), then allocate the output across branches.
// Each step calls its own tested endpoint; nothing here recalculates
// what the backend/database already do.
export default function BreakdownEntry() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [step, setStep] = useState(1);

  // Step 1 state
  const [purchase, setPurchase] = useState({
    branch_id: '',
    animal_type: 'beef',
    invoice_weight_kg: '',
    received_weight_kg: '',
    cost: '',
    purchase_date: new Date().toISOString().slice(0, 10),
  });
  const [carcassPurchaseId, setCarcassPurchaseId] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');

  // Step 2 state
  const [breakdownRows, setBreakdownRows] = useState({}); // productId -> { output_weight_kg, expected_yield_pct }
  const [savedBreakdown, setSavedBreakdown] = useState([]); // [{id, product_id, output_weight_kg}]
  const [breakdownError, setBreakdownError] = useState('');

  // Step 3 state
  const [allocations, setAllocations] = useState({}); // breakdownRecordId -> { branchId: weight }
  const [transferStatus, setTransferStatus] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/branches'), apiGet('/products')]).then(([b, p]) => {
      setBranches(b);
      setProducts(p);
      setPurchase((s) => ({ ...s, branch_id: String(b.find((br) => br.is_main)?.id || '') }));
    });
  }, []);

  const receivedWeight = Number(purchase.received_weight_kg) || 0;
  const totalOutput = Object.values(breakdownRows).reduce(
    (sum, r) => sum + (Number(r.output_weight_kg) || 0), 0
  );
  const breakdownLoss = receivedWeight - totalOutput;

  const submitPurchase = async () => {
    setPurchaseError('');
    try {
      const saved = await apiPost('/carcass-purchases', {
        branch_id: Number(purchase.branch_id),
        animal_type: purchase.animal_type,
        invoice_weight_kg: Number(purchase.invoice_weight_kg),
        received_weight_kg: Number(purchase.received_weight_kg),
        cost: Number(purchase.cost),
        purchase_date: purchase.purchase_date,
      });
      setCarcassPurchaseId(saved.id);
      setStep(2);
    } catch (err) {
      setPurchaseError(err.message);
    }
  };

  const submitBreakdown = async () => {
    setBreakdownError('');
    const items = Object.entries(breakdownRows)
      .filter(([, r]) => r.output_weight_kg)
      .map(([productId, r]) => ({
        product_id: Number(productId),
        output_weight_kg: Number(r.output_weight_kg),
        expected_yield_pct: Number(r.expected_yield_pct) || 0,
      }));
    if (items.length === 0) {
      setBreakdownError('Enter at least one product output before continuing.');
      return;
    }
    try {
      const saved = await apiPost('/breakdown-records', {
        carcass_purchase_id: carcassPurchaseId,
        items,
      });
      setSavedBreakdown(saved);
      setStep(3);
    } catch (err) {
      setBreakdownError(err.message);
    }
  };

  const submitAllocations = async () => {
    setTransferStatus('saving');
    try {
      const calls = [];
      for (const record of savedBreakdown) {
        const rowAlloc = allocations[record.id] || {};
        for (const branch of branches) {
          const weight = Number(rowAlloc[branch.id]);
          if (weight > 0) {
            calls.push(apiPost('/branch-transfers', {
              breakdown_record_id: record.id,
              to_branch_id: branch.id,
              weight_sent_kg: weight,
              transfer_date: purchase.purchase_date,
            }));
          }
        }
      }
      await Promise.all(calls);
      setTransferStatus('done');
    } catch (err) {
      setTransferStatus('error');
    }
  };

  const startNew = () => {
    setStep(1);
    setCarcassPurchaseId(null);
    setBreakdownRows({});
    setSavedBreakdown([]);
    setAllocations({});
    setTransferStatus('');
    setPurchase((s) => ({ ...s, invoice_weight_kg: '', received_weight_kg: '', cost: '' }));
  };

  return (
    <div>
      <div className="step-indicator">
        <span className={step === 1 ? 'active' : step > 1 ? 'done' : ''}>1. Carcass intake</span>
        <span className={step === 2 ? 'active' : step > 2 ? 'done' : ''}>2. Breakdown</span>
        <span className={step === 3 ? 'active' : ''}>3. Allocate to branches</span>
      </div>

      {step === 1 && (
        <div className="card-block">
          <div className="entry-controls">
            <label>
              Branch
              <select value={purchase.branch_id} onChange={(e) => setPurchase((s) => ({ ...s, branch_id: e.target.value }))}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label>
              Animal type
              <select value={purchase.animal_type} onChange={(e) => setPurchase((s) => ({ ...s, animal_type: e.target.value }))}>
                <option value="beef">Beef</option>
                <option value="mutton">Mutton</option>
              </select>
            </label>
            <label>
              Date
              <input type="date" value={purchase.purchase_date} onChange={(e) => setPurchase((s) => ({ ...s, purchase_date: e.target.value }))} />
            </label>
          </div>
          <div className="entry-controls">
            <label>
              Invoice weight (kg)
              <input type="number" step="0.01" value={purchase.invoice_weight_kg} onChange={(e) => setPurchase((s) => ({ ...s, invoice_weight_kg: e.target.value }))} />
            </label>
            <label>
              Received weight (kg)
              <input type="number" step="0.01" value={purchase.received_weight_kg} onChange={(e) => setPurchase((s) => ({ ...s, received_weight_kg: e.target.value }))} />
            </label>
            <label>
              Cost (KES)
              <input type="number" step="0.01" value={purchase.cost} onChange={(e) => setPurchase((s) => ({ ...s, cost: e.target.value }))} />
            </label>
          </div>
          {purchaseError && <p className="inline-error">{purchaseError}</p>}
          <button className="save-btn" onClick={submitPurchase}>Save and continue to breakdown →</button>
        </div>
      )}

      {step === 2 && (
        <div className="card-block">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Output kg</th>
                <th className="num">Expected %</th>
                <th className="num">Actual %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const row = breakdownRows[p.id] || {};
                const actualPct = receivedWeight ? ((Number(row.output_weight_kg) || 0) / receivedWeight * 100) : 0;
                const expected = Number(row.expected_yield_pct) || 0;
                const diff = Math.abs(actualPct - expected);
                const flagged = row.output_weight_kg && diff > 3;
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="num">
                      <input type="number" step="0.01" className="closing-input ledger-num"
                        value={row.output_weight_kg || ''}
                        onChange={(e) => setBreakdownRows((s) => ({ ...s, [p.id]: { ...s[p.id], output_weight_kg: e.target.value } }))} />
                    </td>
                    <td className="num">
                      <input type="number" step="0.1" className="closing-input ledger-num"
                        value={row.expected_yield_pct || ''}
                        onChange={(e) => setBreakdownRows((s) => ({ ...s, [p.id]: { ...s[p.id], expected_yield_pct: e.target.value } }))} />
                    </td>
                    <td className="num ledger-num">{row.output_weight_kg ? actualPct.toFixed(1) + '%' : '—'}</td>
                    <td>{flagged && <span className="flag-warning">check this</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="loss-summary">
            Received {receivedWeight.toFixed(2)}kg — accounted for {totalOutput.toFixed(2)}kg —
            breakdown loss <strong>{breakdownLoss.toFixed(2)}kg</strong>
            {receivedWeight > 0 && ` (${(breakdownLoss / receivedWeight * 100).toFixed(1)}%)`}
          </p>
          {breakdownError && <p className="inline-error">{breakdownError}</p>}
          <button className="save-btn" onClick={submitBreakdown}>Save and continue to allocation →</button>
        </div>
      )}

      {step === 3 && (
        <div className="card-block">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Product</th>
                {branches.map((b) => <th key={b.id} className="num">{b.name}</th>)}
                <th className="num">Total sent</th>
              </tr>
            </thead>
            <tbody>
              {savedBreakdown.map((record) => {
                const product = products.find((p) => p.id === record.product_id);
                const rowAlloc = allocations[record.id] || {};
                const total = branches.reduce((sum, b) => sum + (Number(rowAlloc[b.id]) || 0), 0);
                return (
                  <tr key={record.id}>
                    <td>{product?.name}<div className="hint">of {Number(record.output_weight_kg).toFixed(2)}kg</div></td>
                    {branches.map((b) => (
                      <td className="num" key={b.id}>
                        <input type="number" step="0.01" className="closing-input ledger-num"
                          value={rowAlloc[b.id] || ''}
                          onChange={(e) => setAllocations((s) => ({
                            ...s, [record.id]: { ...s[record.id], [b.id]: e.target.value },
                          }))} />
                      </td>
                    ))}
                    <td className="num ledger-num">{total.toFixed(2)}kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transferStatus === 'error' && <p className="inline-error">Something failed while saving transfers — check the backend terminal for details.</p>}
          {transferStatus === 'done' ? (
            <div>
              <p className="success-msg">All transfers saved. Stock has been created automatically for each receiving branch.</p>
              <button className="save-btn" onClick={startNew}>Start a new carcass entry</button>
            </div>
          ) : (
            <button className="save-btn" onClick={submitAllocations} disabled={transferStatus === 'saving'}>
              {transferStatus === 'saving' ? 'Saving…' : 'Save allocations'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}