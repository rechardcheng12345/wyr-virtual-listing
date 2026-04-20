import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AddProductModal from './components/AddProductModal';
import EditProductModal from './components/EditProductModal';
import DetailsModal from './components/DetailsModal';
import SendModal from './components/SendModal';
import ConfirmModal from './components/ConfirmModal';
import './styles/global.css';

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
  </svg>
);

export default function App() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const [showAdd, setShowAdd]                   = useState(false);
  const [showSend, setShowSend]                 = useState(false);
  const [editItem, setEditItem]                 = useState(null);
  const [detailItem, setDetailItem]             = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                 = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/listings');
      setListings(data);
    } catch {
      showToast('Failed to load listings.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listings.map((l) => l.id)));
    }
  };

  const handleAdded = (listing) => {
    setListings((prev) => [listing, ...prev]);
    setShowAdd(false);
    showToast(`"${listing.product_name}" added successfully.`);
  };

  const handleUpdated = (listing) => {
    setListings((prev) => prev.map((l) => (l.id === listing.id ? listing : l)));
    setEditItem(null);
    showToast(`"${listing.product_name}" updated successfully.`);
  };

  const handleSent = () => {
    setShowSend(false);
    setSelectedIds(new Set());
    showToast('Email sent successfully.');
  };

  const confirmDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => axios.delete(`/api/listings/${id}`))
      );
      const deletedIds = new Set();
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') deletedIds.add(ids[i]);
      });
      const failed = ids.length - deletedIds.size;

      setListings((prev) => prev.filter((l) => !deletedIds.has(l.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);

      if (failed === 0) {
        showToast(`Deleted ${deletedIds.size} item${deletedIds.size !== 1 ? 's' : ''}.`);
      } else {
        showToast(`Deleted ${deletedIds.size}, ${failed} failed.`, 'error');
      }
    } catch {
      showToast('Failed to delete selected items.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const selectedNames = listings
    .filter((l) => selectedIds.has(l.id))
    .map((l) => l.product_name);

  const allSelected = listings.length > 0 && selectedIds.size === listings.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="app-container">
      <div className="header">
        <h1>Virtual Listing</h1>
        <div className="header-actions">
          {someSelected && (
            <>
              <button className="btn btn-send" onClick={() => setShowSend(true)}>
                <IconSend />
                To Send ({selectedIds.size})
              </button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                <IconTrash />
                Delete ({selectedIds.size})
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <IconPlus />
            Add Product
          </button>
        </div>
      </div>

      {someSelected && (
        <div className="selection-bar">
          {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '0.85rem', textDecoration: 'underline', padding: 0 }}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="table-wrapper">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            Loading…
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Product Format</th>
                <th>URL Link</th>
                <th>Size</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={8}>No listings yet. Click "Add Product" to get started.</td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className={selectedIds.has(l.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(l.id)}
                        onChange={() => toggleSelect(l.id)}
                      />
                    </td>
                    <td>{l.sku}</td>
                    <td style={{ fontWeight: 500 }}>{l.product_name}</td>
                    <td>{l.product_format ?? '—'}</td>
                    <td className="cell-link">
                      {l.url_link ? (
                        <a href={l.url_link} target="_blank" rel="noreferrer" title={l.url_link}>
                          {l.url_link}
                        </a>
                      ) : '—'}
                    </td>
                    <td>{l.size ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(l.created_date).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="icon-btn edit"
                          title="Edit"
                          onClick={() => setEditItem(l)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="icon-btn view"
                          title="View Details"
                          onClick={() => setDetailItem(l)}
                        >
                          <IconEye />
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

      {showAdd && (
        <AddProductModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}
      {editItem && (
        <EditProductModal
          listing={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={handleUpdated}
        />
      )}
      {detailItem && (
        <DetailsModal listing={detailItem} onClose={() => setDetailItem(null)} />
      )}
      {showSend && (
        <SendModal
          selectedIds={Array.from(selectedIds)}
          onClose={() => setShowSend(false)}
          onSent={handleSent}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          title={`Delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}?`}
          confirmLabel="Delete"
          variant="danger"
          busy={deleting}
          onCancel={() => !deleting && setShowDeleteConfirm(false)}
          onConfirm={confirmDeleteSelected}
          message={
            <>
              <p style={{ margin: 0 }}>
                You're about to permanently delete the following
                {selectedIds.size !== 1 ? ' items' : ' item'}:
              </p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: '#475569', maxHeight: 160, overflowY: 'auto' }}>
                {selectedNames.slice(0, 10).map((n, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{n}</li>
                ))}
                {selectedNames.length > 10 && (
                  <li style={{ color: '#94a3b8' }}>…and {selectedNames.length - 10} more</li>
                )}
              </ul>
              <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.88rem' }}>
                The database entries and their S3 files will be removed. This cannot be undone.
              </p>
            </>
          }
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
