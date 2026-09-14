import { formatSingaporeDateTime } from '../utils/dateTime';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);
const mono = { fontFamily: 'monospace', wordBreak: 'break-all' };

export default function CardReadDetailsModal({ request, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Read Request #{request.id}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            <span className="detail-label">Received</span>
            <span className="detail-value">{formatSingaporeDateTime(request.created_at)}</span>

            <span className="detail-label">Order ID</span>
            <span className="detail-value">{fmt(request.order_id)}</span>

            <span className="detail-label">Valid</span>
            <span className={`status-pill ${request.is_valid ? 'approved' : 'failed'}`}>
              {request.is_valid ? 'valid' : 'invalid'}
            </span>

            <span className="detail-label">Validation</span>
            <span className="detail-value">{fmt(request.validation_message)}</span>

            <span className="detail-label">Source</span>
            <span className="detail-value">{fmt(request.source)}</span>

            <span className="detail-label">Client IP</span>
            <span className="detail-value">{fmt(request.client_ip)}</span>

            <span className="detail-label">Vendor</span>
            <span className="detail-value">{fmt(request.vendor)}</span>

            <span className="detail-label">Tag Family / Model</span>
            <span className="detail-value">{fmt(request.tag_family)} {request.tag_model ? `— ${request.tag_model}` : ''}</span>

            <span className="detail-label">Tag Class</span>
            <span className="detail-value">{fmt(request.tag_class)}</span>

            <span className="detail-label">Model Notes</span>
            <span className="detail-value">{fmt(request.model_notes)}</span>

            <span className="detail-label">Data A (Reserved)</span>
            <span className="detail-value" style={mono}>{fmt(request.data_a)}</span>

            <span className="detail-label">Data B (EPC)</span>
            <span className="detail-value" style={mono}>{fmt(request.data_b)}</span>

            <span className="detail-label">Data C (TID)</span>
            <span className="detail-value" style={mono}>{fmt(request.data_c)}</span>

            <span className="detail-label">Data D (User)</span>
            <span className="detail-value" style={mono}>{fmt(request.data_d)}</span>

            <span className="detail-label">Data E</span>
            <span className="detail-value">{fmt(request.data_e)}</span>
          </div>

          {request.raw_text && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Raw Payload</label>
              <textarea rows={5} value={request.raw_text} readOnly style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
