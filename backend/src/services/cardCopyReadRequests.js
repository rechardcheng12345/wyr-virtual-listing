// Storage for incoming tag reads submitted by the customer's reader program
// (card_copy_read_requests table). An append-only inbox shown in the portal.
import pool from '../db/connection.js';

const SELECT_COLUMNS = `
  id, order_id, data_a, data_b, data_c, data_d, data_e, raw_text,
  tag_class, vendor, tag_family, tag_model, model_notes,
  is_valid, validation_message, source, client_ip, created_at`;

export async function createReadRequest(entry) {
  const {
    orderId = null,
    dataA = null,
    dataB = null,
    dataC = null,
    dataD = null,
    dataE = null,
    rawText = null,
    tagClass = null,
    vendor = null,
    tagFamily = null,
    tagModel = null,
    modelNotes = null,
    isValid = false,
    validationMessage = null,
    source = null,
    clientIp = null,
  } = entry;

  const [result] = await pool.execute(
    `INSERT INTO card_copy_read_requests
       (order_id, data_a, data_b, data_c, data_d, data_e, raw_text,
        tag_class, vendor, tag_family, tag_model, model_notes,
        is_valid, validation_message, source, client_ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId, dataA, dataB, dataC, dataD, dataE, rawText,
      tagClass, vendor, tagFamily, tagModel, modelNotes,
      isValid ? 1 : 0, validationMessage, source, clientIp,
    ]
  );

  return getReadRequestById(result.insertId);
}

// Most recent first. `limit` is clamped to 1..100 and inlined as a sanitized
// integer (mysql2 prepared statements reject a bound LIMIT placeholder).
export async function getRecentReadRequests(limit = 20) {
  const n = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM card_copy_read_requests
     ORDER BY created_at DESC, id DESC
     LIMIT ${n}`
  );
  return rows;
}

export async function getReadRequestById(id) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_COLUMNS} FROM card_copy_read_requests WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}
