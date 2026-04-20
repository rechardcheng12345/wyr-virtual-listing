const fmt = (v) => v ?? '—';

export default function DetailsModal({ listing, onClose }) {
  const createdAt = new Date(listing.created_date).toLocaleString();
  const updatedAt = new Date(listing.updated_at).toLocaleString();

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Listing Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            <span className="detail-label">ID</span>
            <span className="detail-value">{listing.id}</span>

            <span className="detail-label">SKU</span>
            <span className="detail-value">{fmt(listing.sku)}</span>

            <span className="detail-label">Product Name</span>
            <span className="detail-value">{fmt(listing.product_name)}</span>

            <span className="detail-label">Format</span>
            <span className="detail-value">{fmt(listing.product_format)}</span>

            <span className="detail-label">URL Link</span>
            <span className="detail-value">
              {listing.url_link ? (
                <a href={listing.url_link} target="_blank" rel="noreferrer">
                  {listing.url_link}
                </a>
              ) : '—'}
            </span>

            <span className="detail-label">Size</span>
            <span className="detail-value">{fmt(listing.size)}</span>

            <span className="detail-label">File Path</span>
            <span className="detail-value">{fmt(listing.file_path)}</span>

            <span className="detail-label">Created</span>
            <span className="detail-value">{createdAt}</span>

            <span className="detail-label">Updated</span>
            <span className="detail-value">{updatedAt}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
