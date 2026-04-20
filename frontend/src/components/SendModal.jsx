import { useState } from 'react';
import axios from 'axios';

export default function SendModal({ selectedIds, onClose, onSent }) {
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('presign_url');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSending(true);

    try {
      await axios.post('/api/send', {
        listing_ids: selectedIds,
        email,
        delivery_method: deliveryMethod,
      });
      onSent();
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Failed to send. Please check your SMTP settings.');
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Send Selected Items</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              color: '#475569',
            }}
          >
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected for delivery.
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="form-group">
            <label>Delivery Method *</label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
            >
              <option value="presign_url">Gen Pre-Sign URL and Send</option>
            </select>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
            A pre-signed S3 download link will be generated for each selected product and emailed to the recipient. Links are valid for 3 days.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button className="btn btn-send" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
