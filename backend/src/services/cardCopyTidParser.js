// UHF Gen2 tag identify logic (from TID readout). Chip identity always comes
// from the TID bank (Data C) — never from the EPC payload.
//
// The chip database lives in cardCopyChips.json (data-driven): add a row to
// support a new chip without touching this parse code. Lookup is tiered:
//   1. exact tidPrefix (longest-matching prefix wins)   -> matchMethod "prefix"
//   2. else (mdid, tmn) pair                            -> matchMethod "mdid_tmn"
//   3. else mdid only (vendor known, model unknown)     -> matchMethod "mdid"
//   4. else nothing                                     -> matchMethod "none"
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHIPS = JSON.parse(readFileSync(path.join(__dirname, 'cardCopyChips.json'), 'utf8'));

const DEFAULT_TAG_CLASS = 'GS1 EPCglobal (EPC Gen2)';

// GS1 EPC TDS Registration Authority MDID -> vendor (subset). Fills Vendor when
// the model table misses. https://www.gs1.org/epcglobal/standards/mdid
const MDID_VENDORS = {
  0x001: 'Impinj',
  0x002: 'Texas Instruments',
  0x003: 'Alien Technology',
  0x004: 'Intelleflex',
  0x005: 'Atmel',
  0x006: 'NXP Semiconductors',
};

function normalizeHex(value) {
  if (Array.isArray(value)) {
    return value.map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  if (value && typeof value === 'object' && typeof value.length === 'number') {
    // Buffer / typed array
    return Array.from(value, (b) => (b & 0xff).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

function hexToBytes(cleanHex) {
  const n = Math.floor(cleanHex.length / 2);
  const bytes = new Array(n);
  for (let i = 0; i < n; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function emptyResult() {
  return {
    // Backward-compatible fields consumed elsewhere in the app.
    tagClass: 'Unknown',
    vendor: 'Unknown',
    tagFamily: 'Unknown',
    tagModel: 'Unknown',
    modelNotes: '',
    xtidSupported: 'N/A',
    isValid: false,
    errorMessage: '',
    // Spec DTO additions.
    errorCode: '',
    mdid: null,
    tmn: null,
    tidPrefix4: '',
    tidHex: '',
    epcHex: null,
    xtid: false,
    security: false,
    file: false,
    matchMethod: 'none',
  };
}

function findByPrefix(cleanHex) {
  let best = null;
  let bestLen = -1;
  for (const row of CHIPS) {
    const prefix = (row.tidPrefix || '').toUpperCase();
    if (prefix && cleanHex.startsWith(prefix) && prefix.length > bestLen) {
      best = row;
      bestLen = prefix.length;
    }
  }
  return best;
}

function findByMdidTmn(mdid, tmn) {
  return (
    CHIPS.find(
      (r) => Number.isInteger(r.mdid) && Number.isInteger(r.tmn) && r.mdid === mdid && r.tmn === tmn
    ) || null
  );
}

// Optional EPC bank parsing (display / sanity check only — never chip identity).
// Common reader dump layout: CRC(2) + PC(2) + EPC(N). Returns the EPC hex.
export function extractEpc(epcRawHex) {
  const clean = normalizeHex(epcRawHex);
  if (clean.length < 8) return null;
  const bytes = hexToBytes(clean);
  const pc = (bytes[2] << 8) | bytes[3];
  const epcWords = (pc >> 11) & 0x1f; // PC bits 15..11 = EPC length in 16-bit words
  const epc = clean.slice(8, 8 + epcWords * 2 * 2);
  return epc || null;
}

// Identify a tag from its TID. `epcRawHex` is optional and used only to surface
// the EPC payload — it never influences vendor/model.
export function parseTIDData(hexData, epcRawHex = null) {
  const result = emptyResult();

  try {
    const cleanHex = normalizeHex(hexData);
    result.tidHex = cleanHex;
    if (epcRawHex) result.epcHex = extractEpc(epcRawHex);

    // Need at least 4 bytes (8 hex chars) for the TID header.
    if (cleanHex.length < 8) {
      result.errorMessage = 'TID data too short (minimum 4 bytes required)';
      result.errorCode = 'TID_TOO_SHORT';
      return result;
    }

    const bytes = hexToBytes(cleanHex);
    result.tidPrefix4 = cleanHex.slice(0, 8);

    // Step 1 — Tag Class from the class byte tid[0].
    if (bytes[0] !== 0xe2) {
      result.tagClass = 'Unknown / non-E2 TID class';
      result.errorCode = 'NON_E2_TID';
      result.errorMessage = 'Non-E2 TID class; chip cannot be identified from TID';
      return result; // vendor/model stay Unknown
    }
    result.tagClass = DEFAULT_TAG_CLASS;

    if (![bytes[1], bytes[2], bytes[3]].every((b) => Number.isInteger(b))) {
      result.errorMessage = 'TID header is not valid hex';
      result.errorCode = 'TID_INVALID';
      return result;
    }

    // Step 2 — parse the E2 TID header (first 32 bits, EPC TDS bit numbering).
    result.xtid = ((bytes[1] >> 7) & 1) === 1; // bit 8
    result.security = ((bytes[1] >> 6) & 1) === 1; // bit 9
    result.file = ((bytes[1] >> 5) & 1) === 1; // bit 10
    result.xtidSupported = result.xtid ? 'Yes' : 'No';

    const mdid = ((bytes[1] & 0x1f) << 4) | ((bytes[2] >> 4) & 0x0f); // bits 11..19
    const tmn = ((bytes[2] & 0x0f) << 8) | bytes[3]; // bits 20..31
    result.mdid = mdid;
    result.tmn = tmn;

    // Steps 3-4 — resolve fields.
    const byPrefix = findByPrefix(cleanHex);
    const byMdidTmn = byPrefix ? null : findByMdidTmn(mdid, tmn);
    const row = byPrefix || byMdidTmn;

    if (row) {
      result.vendor = row.vendor ?? MDID_VENDORS[mdid] ?? 'Unknown';
      result.tagModel = row.model ?? 'Unknown';
      result.tagFamily = row.family ?? 'Unknown';
      result.tagClass = row.tagClass ?? DEFAULT_TAG_CLASS;
      result.modelNotes = row.modelNotes ?? '';
      result.matchMethod = byPrefix ? 'prefix' : 'mdid_tmn';
      result.isValid = true;
    } else if (MDID_VENDORS[mdid]) {
      result.vendor = MDID_VENDORS[mdid];
      result.tagModel = `Unknown (${tmn.toString(16).toUpperCase().padStart(3, '0')})`;
      result.tagFamily = 'Unknown';
      result.modelNotes = '';
      result.matchMethod = 'mdid';
      result.isValid = true;
    } else {
      // Header parsed but no vendor known for this MDID.
      result.matchMethod = 'none';
      result.isValid = true;
    }

    return result;
  } catch (err) {
    result.errorMessage = `TID parsing error: ${err.message}`;
    result.errorCode = 'TID_ERROR';
    return result;
  }
}
