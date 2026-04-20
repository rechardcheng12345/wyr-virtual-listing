import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, recipient_email, delivery_method, status, product_count, error_message, sent_at, created_at
       FROM email_history
       ORDER BY sent_at DESC, id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [historyRows] = await pool.execute(
      `SELECT id, recipient_email, delivery_method, status, product_count, error_message, sent_at, created_at
       FROM email_history
       WHERE id = ?`,
      [req.params.id]
    );

    if (historyRows.length === 0) {
      return res.status(404).json({ error: 'Email history not found' });
    }

    const [items] = await pool.execute(
      `SELECT id, listing_id, sku, product_name, download_url, created_at
       FROM email_history_items
       WHERE history_id = ?
       ORDER BY id ASC`,
      [req.params.id]
    );

    res.json({ ...historyRows[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch email history details' });
  }
});

export default router;
