import { createHash } from 'node:crypto';

const HEX_RE = /^[0-9a-fA-F]+$/;

export function isValidHardwareId(hardwareId) {
  return (
    typeof hardwareId === 'string' &&
    hardwareId.length > 0 &&
    hardwareId.length % 2 === 0 &&
    HEX_RE.test(hardwareId)
  );
}

export function isValidExpiryDate(expiryDate) {
  return typeof expiryDate === 'string' && /^\d{8}$/.test(expiryDate);
}

// Ports the MYR Key Issuer (legacy WinForms app) key derivation:
// outputKey = "FF" + expiryDate + last 4 bytes of MD5("FF" + expiryDate + hardwareId)
// keyFile   = bytes("FF" + expiryDate) + full 16-byte MD5 digest
export function generateKey({ hardwareId, expiryDate }) {
  if (!isValidExpiryDate(expiryDate)) {
    throw new Error('expiryDate must be 8 digits (yyyyMMdd)');
  }
  if (!isValidHardwareId(hardwareId)) {
    throw new Error('hardwareId must be a non-empty hex string with an even number of characters');
  }

  const expiryHex = `FF${expiryDate}`;
  const dataBytes = Buffer.from(expiryHex + hardwareId, 'hex');
  const hash = createHash('md5').update(dataBytes).digest();

  const outputKey = expiryHex + hash.subarray(-4).toString('hex');
  const fileBuffer = Buffer.concat([Buffer.from(expiryHex, 'hex'), hash]);

  return { outputKey, fileBuffer };
}
