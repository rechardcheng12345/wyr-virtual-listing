import { useEffect, useState } from 'react';
import axios from 'axios';
import EmailHistoryDetailsModal from './EmailHistoryDetailsModal';
import { formatSingaporeDateTime } from '../utils/dateTime';

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function EmailHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const { data } = await axios.get('/api/email-history');
        if (!cancelled) setHistory(data);
      } catch {
        if (!cancelled) setError('Failed to load email history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const openDetail = async (id) => {
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const { data } = await axios.get(`/api/email-history/${id}`);
      setDetail(data);
    } catch {
      setDetailError('Failed to load email details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Email History</h2>
          <p>Sent purchase emails and their product records.</p>
        </div>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#ef4444' }}>{error}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Status</th>
                <th>Products</th>
                <th>Sent Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={5}>No email history yet.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.recipient_email}</td>
                    <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                    <td>{item.product_count}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatSingaporeDateTime(item.sent_at)}</td>
                    <td>
                      <button
                        className="icon-btn view"
                        title="View products"
                        onClick={() => openDetail(item.id)}
                      >
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {(detailLoading || detailError || detail) && (
        <EmailHistoryDetailsModal
          history={detail}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            setDetail(null);
            setDetailError('');
            setDetailLoading(false);
          }}
        />
      )}
    </>
  );
}
