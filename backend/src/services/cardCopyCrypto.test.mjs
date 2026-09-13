import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  encryptString,
  decryptString,
  generateChecksum,
  generateOrderHash,
  generateEncryptedClientData,
} from './cardCopyCrypto.js';

// --- AES round-trip: proves the key derivation + AES-256-CBC/PKCS7 + IV layout
// are self-consistent (and therefore decryptable by any client using the same
// scheme). ---
const sample = 'The quick brown fox jumps over the lazy dog. 0123456789';
assert.equal(decryptString(encryptString(sample)), sample, 'AES round-trips');

// Two encryptions of the same text differ (random IV) but both decrypt back.
const a = encryptString(sample);
const b = encryptString(sample);
assert.notEqual(a, b, 'random IV makes ciphertext non-deterministic');
assert.equal(decryptString(a), decryptString(b), 'both decrypt to the same plaintext');

// The IV is the first 16 bytes of base64(IV+ciphertext); total length is a
// multiple of the 16-byte AES block.
const raw = Buffer.from(a, 'base64');
assert.equal(raw.length % 16, 0, 'IV + ciphertext is block-aligned');
assert.ok(raw.length >= 32, 'includes a 16-byte IV plus at least one block');

// --- Checksum: SHA-256, first 4 bytes, uppercase hex (spec from OrderDatabase). ---
function sha256Prefix(input, bytes) {
  const d = crypto.createHash('sha256').update(Buffer.from(input, 'utf8')).digest();
  return d.subarray(0, bytes).toString('hex').toUpperCase();
}
assert.equal(generateChecksum('hello'), sha256Prefix('hello', 4), 'checksum = SHA-256[0:4] upper');
assert.equal(generateChecksum('hello').length, 8, 'checksum is 8 hex chars');

// --- Order hash: SHA-256 of "oid:epc:tid:ts", first 6 bytes, upper. ---
assert.equal(
  generateOrderHash('1001', 'EPC', 'TID', '20260101120000'),
  sha256Prefix('1001:EPC:TID:20260101120000', 6),
  'order hash = SHA-256[0:6] upper of the joined fields'
);
assert.equal(generateOrderHash('1001', 'EPC', 'TID', '20260101120000').length, 12, 'hash is 12 hex chars');

// --- Full client blob: wrapper + double-base64 + embedded checksum. ---
const order = {
  orderId: '1001',
  dataA: '0000000000000000',
  dataB: '3000E2003412ABCDEF01234567',
  dataC: 'E2003412012345670000ABCD',
  dataD: 'DEADBEEF',
};
const vh = generateOrderHash(order.orderId, order.dataB, order.dataC, '20260101120000');
const blob = generateEncryptedClientData(order, vh, '20260101120000');

assert.ok(blob.startsWith('BEGIN_SELLER_DATA\n'), 'blob has BEGIN header');
assert.ok(blob.endsWith('\nEND_SELLER_DATA'), 'blob has END footer');

// Peel the wrapper -> outer base64 -> inner base64(IV+ciphertext) -> JSON.
const innerB64 = blob.split('\n')[1];
const encryptedData = Buffer.from(innerB64, 'base64').toString('utf8');
const payload = JSON.parse(decryptString(encryptedData));

assert.equal(payload.oid, '1001');
assert.equal(payload.vh, vh);
assert.equal(payload.ts, '20260101120000');
assert.equal(payload.epc, order.dataB);
assert.equal(payload.tid, order.dataC);
assert.equal(payload.rsv, order.dataA, 'reserved bank carried when non-empty');
assert.equal(payload.usr, order.dataD, 'user bank carried');

// chk is SHA-256[0:4] of oid + epc + tid + reserved + user (as built by the port).
const expectedChk = sha256Prefix(order.orderId + order.dataB + order.dataC + order.dataA + order.dataD, 4);
assert.equal(payload.chk, expectedChk, 'checksum matches the documented input order');

// JSON key order matches the C# anonymous type (important for a byte-stable payload).
assert.deepEqual(Object.keys(payload), ['oid', 'vh', 'ts', 'epc', 'tid', 'rsv', 'usr', 'chk']);

// "No data" reserved bank is treated as empty for the checksum and omitted as rsv.
const order2 = { orderId: '2002', dataA: 'No data', dataB: 'EPCVALUE', dataC: 'TIDVALUE', dataD: null };
const blob2 = generateEncryptedClientData(order2, 'ABC123', '20260101120000');
const payload2 = JSON.parse(decryptString(Buffer.from(blob2.split('\n')[1], 'base64').toString('utf8')));
assert.equal(payload2.rsv, undefined, 'empty reserved bank is omitted');
assert.equal(payload2.usr, undefined, 'null user bank is omitted');
assert.equal(
  payload2.chk,
  sha256Prefix('2002' + 'EPCVALUE' + 'TIDVALUE' + '' + '', 4),
  '"No data"/null banks count as empty strings in the checksum'
);

console.log('cardCopyCrypto.test.mjs: all assertions passed');
