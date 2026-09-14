import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CardCopyDetailsModal from './CardCopyDetailsModal';
import ConfirmModal from './ConfirmModal';
import { formatSingaporeDateTime } from '../utils/dateTime';

const CLIENT_INSTRUCTIONS =
  'Paste in Approved Data there, and press "Check" button.\r\n' +
  'If showed error when write, please try to move the RFID tag around and write again';

// Lightweight mirror of the backend validity check, so the Approve button
// reflects the pasted data before a round-trip. The backend re-validates.
function bankPresent(v) {
  return !!v && !v.includes('No data') && !v.includes('Access denied');
}
function allZeros(v) {
  if (!v) return true;
  const clean = v.replace(/\s/g, '');
  return clean.length > 0 && [...clean].every((c) => c === '0');
}

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);

export default function CardCopyPage({ showToast }) {
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [remark, setRemark] = useState('');
  const [processing, setProcessing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [formError, setFormError] = useState('');
  const [encrypted, setEncrypted] = useState('');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const { data } = await axios.get('/api/card-copy');
      setOrders(data);
    } catch {
      setListError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleProcess = async () => {
    const text = inputText.trim();
    if (!text) {
      setFormError('Please paste the client data above.');
      return;
    }
    setProcessing(true);
    setFormError('');
    setEncrypted('');
    try {
      const { data } = await axios.post('/api/card-copy/parse', { text });
      setParsed(data);
      setOrderId(data.orderId ?? '');
    } catch {
      setFormError('Failed to parse client data.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setFormError('');
    try {
      const { data } = await axios.post('/api/card-copy/approve', {
        orderId,
        dataA: parsed.dataA,
        dataB: parsed.dataB,
        dataC: parsed.dataC,
        dataD: parsed.dataD,
        dataE: parsed.dataE,
        remark,
      });
      setEncrypted(data.encryptedData);
      showToast?.(`Order ${orderId} approved. Encrypted data ready.`);
      fetchOrders();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to approve order.');
    } finally {
      setApproving(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setParsed(null);
    setOrderId('');
    setRemark('');
    setFormError('');
    setEncrypted('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/card-copy/${deleteTarget.id}`);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast?.('Order deleted.');
    } catch {
      showToast?.('Failed to delete order.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyText = async (text, okMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast?.(okMessage);
    } catch {
      showToast?.('Failed to copy.', 'error');
    }
  };

  const banksOk =
    parsed &&
    bankPresent(parsed.dataB) &&
    bankPresent(parsed.dataC) &&
    !allZeros(parsed.dataB) &&
    !allZeros(parsed.dataC);
  const canApprove = !!parsed && orderId.trim() !== '' && banksOk;

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.order_id ?? '').toLowerCase().includes(q) ||
        (o.vendor ?? '').toLowerCase().includes(q) ||
        (o.tag_model ?? '').toLowerCase().includes(q) ||
        (o.remark ?? '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Card Copy Program</h2>
          <p>Approve client RFID data, generate encrypted client blobs, and review issued orders.</p>
        </div>
      </div>

      <div className="table-wrapper" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formError && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label>Client Data</label>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={'Paste client data here (Order ID, Data A–E)…'}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleProcess} disabled={processing}>
              {processing ? 'Processing…' : 'Process'}
            </button>
            <button className="btn btn-secondary" onClick={handleClear} disabled={processing || approving}>
              Clear
            </button>
          </div>

          {parsed && (
            <>
              <div
                style={{
                  fontSize: '0.85rem',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: parsed.isValid ? '#f0fdf4' : '#fffbeb',
                  color: parsed.isValid ? '#15803d' : '#b45309',
                }}
              >
                {parsed.isValid ? '✓ ' : '⚠ '}
                {parsed.validationMessage}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label>Order ID *</label>
                  <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID" />
                </div>
                <div className="form-group">
                  <label>Remark</label>
                  <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional note" />
                </div>
              </div>

              <div className="detail-grid">
                <span className="detail-label">Vendor</span>
                <span className="detail-value">{fmt(parsed.vendor)}</span>
                <span className="detail-label">Tag Model</span>
                <span className="detail-value">{fmt(parsed.tagModel)}</span>
                <span className="detail-label">Tag Family</span>
                <span className="detail-value">{fmt(parsed.tagFamily)}</span>
                <span className="detail-label">Tag Class</span>
                <span className="detail-value">{fmt(parsed.tagClass)}</span>
                <span className="detail-label">Model Notes</span>
                <span className="detail-value">{fmt(parsed.modelNotes)}</span>
                <span className="detail-label">Data B (EPC)</span>
                <span className="detail-value" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{fmt(parsed.dataB)}</span>
                <span className="detail-label">Data C (TID)</span>
                <span className="detail-value" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{fmt(parsed.dataC)}</span>
              </div>

              <div>
                <button className="btn btn-primary" onClick={handleApprove} disabled={!canApprove || approving}>
                  {approving ? 'Approving…' : 'Approve & Generate'}
                </button>
              </div>
            </>
          )}

          {encrypted && (
            <div className="form-group">
              <label>Encrypted Client Data</label>
              <textarea rows={4} value={encrypted} readOnly style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => copyText(encrypted, 'Encrypted data copied — send this to the client.')}
                >
                  Copy Encrypted Data
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => copyText(`${encrypted}\r\n\r\n${CLIENT_INSTRUCTIONS}`, 'Encrypted data + instructions copied.')}
                >
                  Copy with Instructions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="listing-toolbar">
        <label className="search-field">
          <span>Search orders</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order, vendor, model, or remark"
          />
        </label>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : listError ? (
          <div style={{ padding: '24px', color: '#ef4444' }}>{listError}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Approved At</th>
                <th>Status</th>
                <th className="col-hide-mobile">Vendor</th>
                <th className="col-hide-mobile">Tag Model</th>
                <th className="col-hide-mobile">Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={7}>No orders yet.</td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.order_id}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatSingaporeDateTime(o.approved_time)}</td>
                    <td><span className={`status-pill ${(o.status || '').toLowerCase()}`}>{o.status}</span></td>
                    <td className="col-hide-mobile">{fmt(o.vendor)}</td>
                    <td className="col-hide-mobile">{fmt(o.tag_model)}</td>
                    <td className="col-hide-mobile">{fmt(o.remark)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setDetailOrder(o)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setDeleteTarget(o)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {detailOrder && (
        <CardCopyDetailsModal
          order={detailOrder}
          showToast={showToast}
          onClose={() => setDetailOrder(null)}
          onSaved={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setDetailOrder(updated);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete order?"
          confirmLabel="Delete"
          variant="danger"
          busy={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
          message={
            <>
              <p style={{ margin: 0 }}>
                Delete order <strong>{deleteTarget.order_id}</strong>?
              </p>
              <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.88rem' }}>
                This removes the database record and cannot be undone.
              </p>
            </>
          }
        />
      )}
    </>
  );
}
