// Storage for Card Copy Program approved orders (card_copy_orders table).
// Replaces OrderDatabase.cs's local JSON file. Upserts by order_id, mirroring
// the desktop app's "one record per Order ID" behaviour.
import pool from '../db/connection.js';
import { parseTIDData } from './cardCopyTidParser.js';

const SELECT_COLUMNS = `
  id, order_id, data_a, data_b, data_c, data_d, data_e,
  verification_hash, status, tag_class, vendor, tag_family, tag_model,
  model_notes, remark, approved_time, received_time, created_at, updated_at`;

// Upsert an approved order. Returns the stored row.
export async function saveApprovedOrder(order) {
  const {
    orderId,
    dataA = null,
    dataB = null,
    dataC = null,
    dataD = null,
    dataE = null,
    verificationHash,
    status = 'Approved',
    tagClass = null,
    vendor = null,
    tagFamily = null,
    tagModel = null,
    modelNotes = null,
    remark = null,
    receivedTime = null,
  } = order;

  const received = receivedTime ? new Date(receivedTime) : null;

  await pool.execute(
    `INSERT INTO card_copy_orders
       (order_id, data_a, data_b, data_c, data_d, data_e, verification_hash,
        status, tag_class, vendor, tag_family, tag_model, model_notes, remark,
        approved_time, received_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
     ON DUPLICATE KEY UPDATE
       data_a = VALUES(data_a),
       data_b = VALUES(data_b),
       data_c = VALUES(data_c),
       data_d = VALUES(data_d),
       data_e = VALUES(data_e),
       verification_hash = VALUES(verification_hash),
       status = VALUES(status),
       tag_class = VALUES(tag_class),
       vendor = VALUES(vendor),
       tag_family = VALUES(tag_family),
       tag_model = VALUES(tag_model),
       model_notes = VALUES(model_notes),
       remark = VALUES(remark),
       approved_time = CURRENT_TIMESTAMP,
       received_time = VALUES(received_time)`,
    [
      orderId, dataA, dataB, dataC, dataD, dataE, verificationHash,
      status, tagClass, vendor, tagFamily, tagModel, modelNotes, remark, received,
    ]
  );

  return getOrderByOrderId(orderId);
}

export async function getAllOrders(search = '') {
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    const [rows] = await pool.execute(
      `SELECT ${SELECT_COLUMNS} FROM card_copy_orders
       WHERE order_id LIKE ? OR vendor LIKE ? OR tag_model LIKE ? OR remark LIKE ?
       ORDER BY approved_time DESC, id DESC`,
      [like, like, like, like]
    );
    return rows;
  }
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM card_copy_orders ORDER BY approved_time DESC, id DESC`
  );
  return rows;
}

export async function getOrderById(id) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM card_copy_orders WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getOrderByOrderId(orderId) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM card_copy_orders WHERE order_id = ?`,
    [orderId]
  );
  return rows[0] ?? null;
}

export async function updateRemark(id, remark) {
  const [result] = await pool.execute(
    'UPDATE card_copy_orders SET remark = ? WHERE id = ?',
    [remark ?? null, id]
  );
  return result.affectedRows > 0;
}

// Re-run TID identification against stored Data C, updating any rows whose
// chip metadata has drifted (e.g. after the chip table is extended). Mirrors
// OrderDatabase.RefreshChipIdentities. Returns the number of rows updated.
export async function refreshChipIdentities() {
  const [rows] = await pool.execute(
    'SELECT id, data_c, tag_class, vendor, tag_family, tag_model, model_notes FROM card_copy_orders'
  );

  let updated = 0;
  for (const row of rows) {
    if (!row.data_c || !row.data_c.trim()) continue;
    const parsed = parseTIDData(row.data_c);
    if (!parsed.isValid) continue;

    const changed =
      row.tag_class !== parsed.tagClass ||
      row.vendor !== parsed.vendor ||
      row.tag_family !== parsed.tagFamily ||
      row.tag_model !== parsed.tagModel ||
      (row.model_notes ?? '') !== (parsed.modelNotes ?? '');

    if (!changed) continue;

    await pool.execute(
      `UPDATE card_copy_orders
       SET tag_class = ?, vendor = ?, tag_family = ?, tag_model = ?, model_notes = ?
       WHERE id = ?`,
      [parsed.tagClass, parsed.vendor, parsed.tagFamily, parsed.tagModel, parsed.modelNotes, row.id]
    );
    updated++;
  }

  return updated;
}
