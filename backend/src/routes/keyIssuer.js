import { Router } from 'express';
import pool from '../db/connection.js';
import { generateKey, isValidHardwareId, isValidExpiryDate } from '../services/keyGenerator.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { company = '', invoice = '' } = req.query;
    const [rows] = await pool.execute(
      `SELECT id, company, invoice, hardware_id, expiry_date, output_key, issued_by, issued_at
       FROM issued_keys
       WHERE company LIKE ? AND invoice LIKE ?
       ORDER BY issued_at DESC, id DESC`,
      [`%${company}%`, `%${invoice}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issued keys' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { company, invoice, hardwareId, expiryDate, issuedBy } = req.body;

    if (!company?.trim() || !invoice?.trim()) {
      return res.status(400).json({ error: 'company and invoice are required' });
    }
    if (!isValidExpiryDate(expiryDate)) {
      return res.status(400).json({ error: 'expiryDate must be 8 digits (yyyyMMdd)' });
    }
    if (!isValidHardwareId(hardwareId)) {
      return res.status(400).json({ error: 'hardwareId must be a hex string with an even number of characters' });
    }

    const { outputKey } = generateKey({ hardwareId, expiryDate });

    const [result] = await pool.execute(
      `INSERT INTO issued_keys (company, invoice, hardware_id, expiry_date, output_key, issued_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company.trim(), invoice.trim(), hardwareId, expiryDate, outputKey, issuedBy ?? null]
    );

    const [rows] = await pool.execute(
      `SELECT id, company, invoice, hardware_id, expiry_date, output_key, issued_by, issued_at
       FROM issued_keys WHERE id = ?`,
      [result.insertId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate key' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT hardware_id, expiry_date FROM issued_keys WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Issued key not found' });
    }

    const { hardware_id: hardwareId, expiry_date: expiryDate } = rows[0];
    const { fileBuffer } = generateKey({ hardwareId, expiryDate });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="ap.dc"');
    res.send(fileBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download key file' });
  }
});

export default router;
