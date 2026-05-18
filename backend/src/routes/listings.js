import { Router } from 'express';
import path from 'path';
import pool from '../db/connection.js';
import { upload } from '../middleware/upload.js';
import { uploadToS3, deleteFromS3, keyFromUrl, getPresignedDownloadUrl } from '../services/s3.js';

function formatSku(sku) {
  return sku
    .split(' ')
    .map(word => word.charAt(0).toLowerCase() + word.slice(1))
    .join('_');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

const router = Router();

// GET all listings
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM listings ORDER BY created_date DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET single listing
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM listings WHERE id = ?', [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// GET file redirect — generates a fresh presigned download URL on every click
router.get('/:id/file', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT file_path, product_name FROM listings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

    const { file_path, product_name } = rows[0];
    if (!file_path) return res.status(404).json({ error: 'No file attached to this listing' });

    const key = keyFromUrl(file_path);
    if (!key) return res.status(400).json({ error: 'Invalid file path' });

    const filename = `${product_name}${path.extname(key)}`;
    const presignedUrl = await getPresignedDownloadUrl(key, filename);
    res.redirect(302, presignedUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// POST create listing
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { sku, product_name, product_format, url_link, size, remarks } = req.body;

    if (!sku || !product_name) {
      return res.status(400).json({ error: 'sku and product_name are required' });
    }

    const formattedSku = formatSku(sku);
    const safeName = product_name.replace(/\s+/g, '_');

    let file_path = null;
    let final_url_link = url_link || null;
    let final_size = size || null;
    let final_format = product_format || null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const key = `listings/${safeName}_${Date.now()}${ext}`;
      file_path = await uploadToS3(key, req.file.buffer, req.file.mimetype);
      final_size = formatFileSize(req.file.size);
      final_format = ext.replace(/^\./, '').toUpperCase() || null;
    }

    const [result] = await pool.execute(
      'INSERT INTO listings (sku, product_name, product_format, url_link, size, file_path, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [formattedSku, safeName, final_format, final_url_link, final_size, file_path, remarks || null]
    );

    if (req.file) {
      const proxyUrl = `/api/listings/${result.insertId}/file`;
      await pool.execute('UPDATE listings SET url_link = ? WHERE id = ?', [proxyUrl, result.insertId]);
    }

    const [newRows] = await pool.execute('SELECT * FROM listings WHERE id = ?', [
      result.insertId,
    ]);

    res.status(201).json(newRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT update listing
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const [existingRows] = await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const existing = existingRows[0];

    const { sku, product_name, product_format, url_link, size, remarks } = req.body;
    const formattedSku = formatSku(sku);
    const safeName = product_name.replace(/\s+/g, '_');

    let file_path = existing.file_path;
    let final_url_link = url_link ?? existing.url_link ?? null;
    let final_size = size ?? existing.size ?? null;
    let final_format = product_format ?? existing.product_format ?? null;
    const final_remarks = remarks !== undefined ? (remarks || null) : existing.remarks ?? null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const key = `listings/${safeName}_${Date.now()}${ext}`;

      if (file_path) {
        const oldKey = keyFromUrl(file_path);
        if (oldKey) await deleteFromS3(oldKey);
      }

      file_path = await uploadToS3(key, req.file.buffer, req.file.mimetype);
      final_url_link = `/api/listings/${req.params.id}/file`;
      final_size = formatFileSize(req.file.size);
      final_format = ext.replace(/^\./, '').toUpperCase() || null;
    }

    await pool.execute(
      'UPDATE listings SET sku = ?, product_name = ?, product_format = ?, url_link = ?, size = ?, file_path = ?, remarks = ? WHERE id = ?',
      [formattedSku, safeName, final_format, final_url_link, final_size, file_path, final_remarks, req.params.id]
    );

    const [updatedRows] = await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE listing
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM listings WHERE id = ?', [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = rows[0];
    if (listing.file_path) {
      const key = keyFromUrl(listing.file_path);
      if (key) await deleteFromS3(key);
    }

    await pool.execute('DELETE FROM listings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

export default router;
