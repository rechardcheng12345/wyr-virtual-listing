import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Listing } from '../types';

interface Props {
  onClose: () => void;
  onAdded: (listing: Listing) => void;
}

const INITIAL = {
  sku: '',
  product_name: '',
  product_format: '',
  url_link: '',
  size: '',
};

export default function AddProductModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!form.sku.trim() || !form.product_name.trim()) {
      setError('SKU and Product Name are required.');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('file', file);

    try {
      const { data } = await axios.post<Listing>('/api/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1)));
        },
      });
      onAdded(data);
    } catch {
      setError('Failed to add product. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Product</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="e.g. SKU-001"
            />
          </div>

          <div className="form-group">
            <label>Product Name *</label>
            <input
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              placeholder="e.g. My Product Name"
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Spaces will be replaced with underscores in the filename.
            </span>
          </div>

          <div className="form-group">
            <label>Product Format</label>
            <input
              value={form.product_format}
              onChange={(e) => setForm({ ...form, product_format: e.target.value })}
              placeholder="e.g. PDF, ZIP, MP4"
            />
          </div>

          <div className="form-group">
            <label>URL Link</label>
            <input
              value={form.url_link}
              onChange={(e) => setForm({ ...form, url_link: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>Size</label>
            <input
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              placeholder="e.g. 1.2 GB, 500 MB"
            />
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label>Attachment</label>
            <div
              className={`upload-area${dragOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <div className="upload-icon">📁</div>
              <p>Click or drag a file here to upload</p>
              {file && <p className="file-name">✓ {file.name}</p>}
            </div>

            {uploading && (
              <div className="progress-wrapper">
                <div className="progress-label">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
