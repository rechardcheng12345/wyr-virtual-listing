import { useState } from 'react';
import axios from 'axios';
import { formatSingaporeDateTime } from '../utils/dateTime';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);

// Rebuild the pasteable "Client Data" dump in the format the Card Copy Program
// Client Data field / parser expects.
function buildClientData(o) {
  const lines = [];
  if (o.order_id) lines.push(`Order ID: ${o.order_id}`);
  if (o.data_a) lines.push(`Data A: ${o.data_a}`);
  if (o.data_b) lines.push(`Data B: ${o.data_b}`);
  if (o.data_c) lines.push(`Data C: ${o.data_c}`);
  if (o.data_d) lines.push(`Data D: ${o.data_d}`);
  if (o.data_e) lines.push(`Data E: ${o.data_e}`);
  return lines.join('\n');
}

export default function CardCopyDetailsModal({ order, onClose, onSaved, showToast }) {
  const clientData = buildClientData(order);
  const [remark, setRemark] = useState(order.remark ?? '');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [encrypted, setEncrypted] = useState('');

  const handleSaveRemark = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/card-copy/${order.id}/remark`, { remark });
      showToast?.('Remark updated.');
      onSaved?.(data);
    } catch {
      showToast?.('Failed to update remark.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { data } = await axios.post(`/api/card-copy/${order.id}/regenerate`);
      setEncrypted(data.encryptedData);
      showToast?.('Encrypted data regenerated.');
    } catch {
      showToast?.('Failed to regenerate encrypted data.', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(encrypted);
      showToast?.('Encrypted data copied to clipboard.');
    } catch {
      showToast?.('Failed to copy.', 'error');
    }
  };

  const handleCopyClientData = async () => {
    try {
      await navigator.clipboard.writeText(clientData);
      showToast?.('Client data copied to clipboard.');
    } catch {
      showToast?.('Failed to copy.', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Order {order.order_id}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Client Data (paste into Card Copy Program)</label>
            <textarea
              rows={7}
              value={clientData}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              onFocus={(e) => e.target.select()}
            />
            <button
              className="btn btn-secondary"
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
              onClick={handleCopyClientData}
              disabled={!clientData}
            >
              Copy Client Data
            </button>
          </div>

          <div className="detail-grid" style={{ marginTop: 16 }}>
            <span className="detail-label">Order ID</span>
            <span className="detail-value">{fmt(order.order_id)}</span>

            <span className="detail-label">Status</span>
            <span className={`status-pill ${(order.status || '').toLowerCase()}`}>{fmt(order.status)}</span>

            <span className="detail-label">Approved At</span>
            <span className="detail-value">{formatSingaporeDateTime(order.approved_time)}</span>

            <span className="detail-label">Verification Hash</span>
            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{fmt(order.verification_hash)}</span>

            <span className="detail-label">Vendor</span>
            <span className="detail-value">{fmt(order.vendor)}</span>

            <span className="detail-label">Tag Family / Model</span>
            <span className="detail-value">{fmt(order.tag_family)} {order.tag_model ? `— ${order.tag_model}` : ''}</span>

            <span className="detail-label">Tag Class</span>
            <span className="detail-value">{fmt(order.tag_class)}</span>

            <span className="detail-label">Model Notes</span>
            <span className="detail-value">{fmt(order.model_notes)}</span>

            <span className="detail-label">Data A (Reserved)</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{fmt(order.data_a)}</span>

            <span className="detail-label">Data B (EPC)</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{fmt(order.data_b)}</span>

            <span className="detail-label">Data C (TID)</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{fmt(order.data_c)}</span>

            <span className="detail-label">Data D (User)</span>
            <span className="detail-value" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{fmt(order.data_d)}</span>

            <span className="detail-label">Data E</span>
            <span className="detail-value">{fmt(order.data_e)}</span>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Remark</label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Notes for this order"
            />
          </div>

          {encrypted && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Encrypted Client Data</label>
              <textarea rows={4} value={encrypted} readOnly style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
              <button className="btn btn-secondary" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={handleCopy}>
                Copy Encrypted Data
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? 'Regenerating…' : 'Regenerate Data'}
          </button>
          <button className="btn btn-primary" onClick={handleSaveRemark} disabled={saving}>
            {saving ? 'Saving…' : 'Save Remark'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
