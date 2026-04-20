import { Router, Request, Response } from 'express';
import path from 'path';
import pool from '../db/connection';
import { upload } from '../middleware/upload';
import { uploadToS3, deleteFromS3, keyFromUrl, getPresignedDownloadUrl } from '../services/s3';

function formatFileSize(bytes: number): string {
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
router.get('/', async (_req: Request, res: Response) => {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [rows] = (await pool.execute('SELECT * FROM listings WHERE id = ?', [
      req.params.id,
    ])) as any[];
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json((rows as any[])[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST create listing
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { sku, product_name, product_format, url_link, size } = req.body;

    if (!sku || !product_name) {
      return res.status(400).json({ error: 'sku and product_name are required' });
    }

    const safeName = product_name.replace(/\s+/g, '_');

    let file_path: string | null = null;
    let final_url_link: string | null = url_link || null;
    let final_size: string | null = size || null;
    let final_format: string | null = product_format || null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const key = `listings/${safeName}_${Date.now()}${ext}`;
      file_path = await uploadToS3(key, req.file.buffer, req.file.mimetype);
      final_url_link = await getPresignedDownloadUrl(key, `${safeName}${ext}`);
      final_size = formatFileSize(req.file.size);
      final_format = ext.replace(/^\./, '').toUpperCase() || null;
    }

    const [result] = (await pool.execute(
      'INSERT INTO listings (sku, product_name, product_format, url_link, size, file_path) VALUES (?, ?, ?, ?, ?, ?)',
      [sku, safeName, final_format, final_url_link, final_size, file_path]
    )) as any[];

    const [newRows] = (await pool.execute('SELECT * FROM listings WHERE id = ?', [
      (result as any).insertId,
    ])) as any[];

    res.status(201).json((newRows as any[])[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT update listing
router.put('/:id', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const [existingRows] = (await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [req.params.id]
    )) as any[];

    if ((existingRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const existing = (existingRows as any[])[0];

    const { sku, product_name, product_format, url_link, size } = req.body;
    const safeName = product_name.replace(/\s+/g, '_');

    let file_path: string | null = existing.file_path;
    let final_url_link: string | null = url_link ?? existing.url_link ?? null;
    let final_size: string | null = size ?? existing.size ?? null;
    let final_format: string | null = product_format ?? existing.product_format ?? null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const key = `listings/${safeName}_${Date.now()}${ext}`;

      if (file_path) {
        const oldKey = keyFromUrl(file_path);
        if (oldKey) await deleteFromS3(oldKey);
      }

      file_path = await uploadToS3(key, req.file.buffer, req.file.mimetype);
      final_url_link = await getPresignedDownloadUrl(key, `${safeName}${ext}`);
      final_size = formatFileSize(req.file.size);
      final_format = ext.replace(/^\./, '').toUpperCase() || null;
    }

    await pool.execute(
      'UPDATE listings SET sku = ?, product_name = ?, product_format = ?, url_link = ?, size = ?, file_path = ? WHERE id = ?',
      [sku, safeName, final_format, final_url_link, final_size, file_path, req.params.id]
    );

    const [updatedRows] = (await pool.execute(
      'SELECT * FROM listings WHERE id = ?',
      [req.params.id]
    )) as any[];

    res.json((updatedRows as any[])[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE listing
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [rows] = (await pool.execute('SELECT * FROM listings WHERE id = ?', [
      req.params.id,
    ])) as any[];

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = (rows as any[])[0];
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
