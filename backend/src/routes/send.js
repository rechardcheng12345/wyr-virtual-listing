import { Router } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';
import { keyFromUrl, getPresignedDownloadUrl } from '../services/s3.js';
import {
  buildHistoryItems,
  createEmailHistory,
  markEmailHistoryStatus,
} from '../services/emailHistory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

const PRESIGN_EXPIRY_SECONDS = 3 * 24 * 60 * 60; // 3 days
const LOGO_PATH = path.resolve(__dirname, '../../static/logo.jpeg');
const LOGO_CID = 'vl-logo@virtual-listing';

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(rows) {
  const tableRows = rows
    .map((r) => {
      const linkCell = r.url
        ? `<a href="${r.url}" style="color:#4f46e5;text-decoration:none;font-weight:500;">Click Here To Download</a>`
        : `<span style="color:#94a3b8;">File unavailable</span>`;
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1a202c;font-weight:500;">${escapeHtml(r.name)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;">${linkCell}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <tr>
              <td align="center" style="padding:32px 24px 16px;">
                <img src="cid:${LOGO_CID}" alt="Logo" style="max-width:160px;height:auto;display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;text-align:center;">
                <h1 style="margin:0 0 8px;font-size:22px;color:#1a202c;font-weight:700;">Thank you for your purchase!</h1>
                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                  We appreciate your business. Your product files are ready to download using the secure links below.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <h2 style="margin:0 0 12px;font-size:14px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Products</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                  <thead>
                    <tr style="background:#f1f5f9;">
                      <th align="left" style="padding:10px 16px;font-size:12px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Product Name</th>
                      <th align="right" style="padding:10px 16px;font-size:12px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">URL Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;background:#fff7ed;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:6px;">
                  <strong style="color:#b45309;">Note:</strong> These download links are valid for <strong>3 days</strong> from the time this email was sent. Please download your files before they expire.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 24px 32px;border-top:1px solid #f1f5f9;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  If you have any questions, simply reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

router.post('/', async (req, res) => {
  let historyId = null;
  try {
    const { listing_ids, email, delivery_method = 'presign_url' } = req.body;

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      return res.status(400).json({ error: 'listing_ids must be a non-empty array' });
    }
    if (!email) return res.status(400).json({ error: 'email is required' });

    const placeholders = listing_ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT * FROM listings WHERE id IN (${placeholders})`,
      listing_ids
    );
    const listings = rows;

    const downloadUrlsByListingId = new Map();
    const rowsForEmail = await Promise.all(
      listings.map(async (l) => {
        let url = null;
        if (l.file_path) {
          const key = keyFromUrl(l.file_path);
          if (key) {
            const ext = path.extname(key);
            const safeName = l.product_name.replace(/\s+/g, '_');
            url = await getPresignedDownloadUrl(
              key,
              `${safeName}${ext}`,
              PRESIGN_EXPIRY_SECONDS
            );
          }
        }
        downloadUrlsByListingId.set(l.id, url);
        return { name: l.product_name, url };
      })
    );

    const historyItems = buildHistoryItems(listings, downloadUrlsByListingId);
    historyId = await createEmailHistory({
      email,
      deliveryMethod: delivery_method,
      items: historyItems,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Thank you for your purchase – Your download links',
      html: buildEmailHtml(rowsForEmail),
      attachments: [
        {
          filename: 'logo.jpeg',
          path: LOGO_PATH,
          cid: LOGO_CID,
        },
      ],
    });

    await markEmailHistoryStatus(historyId, 'sent');

    res.json({ message: 'Email sent successfully', history_id: historyId });
  } catch (err) {
    console.error(err);
    if (historyId) {
      try {
        await markEmailHistoryStatus(historyId, 'failed', err.message);
      } catch (historyErr) {
        console.error(historyErr);
      }
    }
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
