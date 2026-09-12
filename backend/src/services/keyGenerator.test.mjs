import assert from 'node:assert/strict';
import { generateKey, isValidHardwareId, isValidExpiryDate } from './keyGenerator.js';

// Pinned against the legacy MYR Key Issuer WinForms app's default sample
// inputs (Form1.Designer.cs: txtHardware="10dc297f", txtExpiry="20381111").
const { outputKey, fileBuffer } = generateKey({
  hardwareId: '10dc297f',
  expiryDate: '20381111',
});

assert.equal(outputKey, 'FF20381111ea42096a', 'matches the legacy app output key for known sample inputs');
assert.equal(
  fileBuffer.toString('hex'),
  'ff20381111429fd61e95754dadec9d5b7eea42096a',
  'matches the legacy app .dc file bytes for known sample inputs'
);
assert.equal(fileBuffer.length, 21, 'file buffer is 5 expiry bytes + 16 MD5 bytes');

assert.throws(
  () => generateKey({ hardwareId: '10dc297f', expiryDate: '2038111' }),
  /expiryDate/,
  'rejects an expiry date that is not 8 digits'
);

assert.throws(
  () => generateKey({ hardwareId: 'zz', expiryDate: '20381111' }),
  /hardwareId/,
  'rejects a non-hex hardware id'
);

assert.throws(
  () => generateKey({ hardwareId: 'abc', expiryDate: '20381111' }),
  /hardwareId/,
  'rejects an odd-length hex hardware id'
);

assert.equal(isValidHardwareId('10dc297f'), true);
assert.equal(isValidHardwareId(''), false);
assert.equal(isValidExpiryDate('20381111'), true);
assert.equal(isValidExpiryDate('2038-11-11'), false);
