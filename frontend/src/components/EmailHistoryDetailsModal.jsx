import { formatSingaporeDateTime } from '../utils/dateTime';

export default function EmailHistoryDetailsModal({ history, loading, error, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>Email Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          {history && (
            <>
              <div className="detail-grid">
                <span className="detail-label">Recipient</span>
                <span className="detail-value">{history.recipient_email}</span>

                <span className="detail-label">Status</span>
                <span className={`status-pill ${history.status}`}>{history.status}</span>

                <span className="detail-label">Sent At</span>
                <span className="detail-value">{formatSingaporeDateTime(history.sent_at)}</span>

                {history.error_message && (
                  <>
                    <span className="detail-label">Error</span>
                    <span className="detail-value">{history.error_message}</span>
                  </>
                )}
              </div>

              <div className="history-items">
                <h3>Purchased Products</h3>
                {history.items.length === 0 ? (
                  <p className="muted-text">No products recorded for this email.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Download URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.sku || '-'}</td>
                          <td className="cell-link">
                            {item.download_url ? (
                              <a href={item.download_url} target="_blank" rel="noreferrer" title={item.download_url}>
                                {item.download_url}
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
