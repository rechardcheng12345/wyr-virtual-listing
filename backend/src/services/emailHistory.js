import pool from '../db/connection.js';

export function buildHistoryItems(listings, downloadUrlsByListingId = new Map()) {
  return listings.map((listing) => ({
    listing_id: listing.id,
    sku: listing.sku ?? '',
    product_name: listing.product_name ?? '',
    download_url: downloadUrlsByListingId.get(listing.id) ?? null,
  }));
}

export async function createEmailHistory({ email, deliveryMethod, items }) {
  const [result] = await pool.execute(
    'INSERT INTO email_history (recipient_email, delivery_method, status, product_count) VALUES (?, ?, ?, ?)',
    [email, deliveryMethod, 'pending', items.length]
  );

  const historyId = result.insertId;
  if (items.length > 0) {
    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const values = items.flatMap((item) => [
      historyId,
      item.listing_id,
      item.sku,
      item.product_name,
      item.download_url,
    ]);
    await pool.execute(
      `INSERT INTO email_history_items (history_id, listing_id, sku, product_name, download_url) VALUES ${placeholders}`,
      values
    );
  }

  return historyId;
}

export async function markEmailHistoryStatus(historyId, status, errorMessage = null) {
  await pool.execute(
    'UPDATE email_history SET status = ?, error_message = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, errorMessage, historyId]
  );
}
