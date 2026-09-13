// Port of the CloneCardSellerProgram encryption/hashing (OrderDatabase.cs and
// ClipboardData.GenerateOrderHash). This MUST stay byte-compatible with the
// desktop app so existing client/buyer programs can still decrypt the
// BEGIN_SELLER_DATA blob:
//   - AES-256-CBC + PKCS7 (the .NET Aes.Create() defaults)
//   - key = UTF-8 bytes of the passphrase, right-padded with zero bytes to 32
//   - output = base64(IV[16] + ciphertext)
//   - blob   = "BEGIN_SELLER_DATA\n" + base64(utf8(output)) + "\nEND_SELLER_DATA"
import crypto from 'node:crypto';

// Matches OrderDatabase.encryptionKey (30 chars, zero-padded to 32 for AES-256).
const ENCRYPTION_KEY = 'SellerProgram2025Key!@#$%^&*()';

function keyBytes32() {
  const buf = Buffer.alloc(32); // zero-filled, matches C# Array.Resize padding
  Buffer.from(ENCRYPTION_KEY, 'utf8').copy(buf, 0, 0, 32);
  return buf;
}

export function encryptString(plainText) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBytes32(), iv); // PKCS7 on by default
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plainText, 'utf8')), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

// Inverse of encryptString — used by tests to prove round-trip compatibility.
export function decryptString(base64) {
  const raw = Buffer.from(base64, 'base64');
  const iv = raw.subarray(0, 16);
  const ciphertext = raw.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBytes32(), iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function sha256HexPrefix(input, byteCount) {
  const digest = crypto.createHash('sha256').update(Buffer.from(input, 'utf8')).digest();
  let out = '';
  for (let i = 0; i < Math.min(byteCount, digest.length); i++) {
    out += digest[i].toString(16).padStart(2, '0');
  }
  return out.toUpperCase();
}

// SHA-256, first 4 bytes as uppercase hex (8 chars).
export function generateChecksum(input) {
  return sha256HexPrefix(input, 4);
}

// yyyyMMddHHmmss for a Date (local time), matching C# DateTime.Now formatting.
export function formatTimestamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

// SHA-256 of "orderId:dataB:dataC:timestamp", first 6 bytes as uppercase hex
// (12 chars). Matches ClipboardData.GenerateOrderHash.
export function generateOrderHash(orderId, dataB, dataC, timestamp = formatTimestamp()) {
  return sha256HexPrefix(`${orderId}:${dataB}:${dataC}:${timestamp}`, 6);
}

function bankOrEmpty(value) {
  if (!value || !value.trim()) return '';
  if (value.toLowerCase().includes('no data')) return '';
  if (value.toLowerCase().includes('access denied')) return '';
  return value;
}

// Port of OrderDatabase.GenerateEncryptedClientData. `order` carries
// orderId/dataA/dataB/dataC/dataD. Returns the full BEGIN/END wrapped blob.
export function generateEncryptedClientData(order, verificationHash, timestamp = formatTimestamp()) {
  const { orderId, dataA, dataB, dataC, dataD } = order;

  const tidForChecksum = dataC ?? '';
  const reservedForChecksum = bankOrEmpty(dataA);
  let userDataForChecksum = bankOrEmpty(dataD);
  if (!userDataForChecksum) userDataForChecksum = dataD ?? '';

  // Build in the same property order as the C# anonymous type, omitting nulls
  // (Newtonsoft NullValueHandling.Ignore).
  const clientData = { oid: orderId, vh: verificationHash, ts: timestamp, epc: dataB, tid: dataC };
  if (reservedForChecksum) clientData.rsv = reservedForChecksum;
  if (dataD !== null && dataD !== undefined) clientData.usr = dataD;
  clientData.chk = generateChecksum(
    (orderId ?? '') + (dataB ?? '') + tidForChecksum + reservedForChecksum + userDataForChecksum
  );

  const json = JSON.stringify(clientData);
  const encryptedData = encryptString(json);
  const inner = Buffer.from(encryptedData, 'utf8').toString('base64');
  return `BEGIN_SELLER_DATA\n${inner}\nEND_SELLER_DATA`;
}
