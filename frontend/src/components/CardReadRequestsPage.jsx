import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import CardReadDetailsModal from './CardReadDetailsModal';
import { formatSingaporeDateTime } from '../utils/dateTime';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);
const POLL_MS = 20000;

export default function CardReadRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const initialLoad = useRef(true);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/card-copy/read-requests', { params: { limit: 20 } });
      setRequests(data);
      setError('');
    } catch {
      if (initialLoad.current) setError('Failed to load read requests.');
    } finally {
      initialLoad.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const id = setInterval(fetchRequests, POLL_MS);
    return () => clearInterval(id);
  }, [fetchRequests]);

  return (
    <>
      <div
        className="page-heading"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
      >
        <div>
          <h2>Card Read Requests</h2>
          <p>The latest 20 tag reads submitted by the customer reader program (auto-refreshes).</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchRequests} style={{ flexShrink: 0 }}>Refresh</button>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#ef4444' }}>{error}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Received</th>
                <th>Order ID</th>
                <th>Valid</th>
                <th className="col-hide-mobile">Vendor</th>
                <th className="col-hide-mobile">Tag Model</th>
                <th className="col-hide-mobile">Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={7}>No read requests yet.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatSingaporeDateTime(r.created_at)}</td>
                    <td style={{ fontWeight: 500 }}>{fmt(r.order_id)}</td>
                    <td>
                      <span className={`status-pill ${r.is_valid ? 'approved' : 'failed'}`}>
                        {r.is_valid ? 'valid' : 'invalid'}
                      </span>
                    </td>
                    <td className="col-hide-mobile">{fmt(r.vendor)}</td>
                    <td className="col-hide-mobile">{fmt(r.tag_model)}</td>
                    <td className="col-hide-mobile">{fmt(r.source)}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setDetail(r)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {detail && <CardReadDetailsModal request={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
